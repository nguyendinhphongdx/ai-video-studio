// Renderer for every @remotion block (components in remotion/blocks). Bundles the Remotion project once and keeps
// one headless browser per worker process, so a 12-scene video does not pay startup cost 12 times.
import path from 'node:path';

import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, selectComposition } from '@remotion/renderer';

import type { SceneRenderContext, SceneRenderInput, ToolRenderer } from '@/core/tools/tool';
import { createLogger } from '@/server/logger';

import { retryTransient } from './retry';
import type { SceneClipProps } from '@video/compositions';

const ROOT = process.cwd();
const logger = createLogger('remotion');
// Fixed port so the bundle server does not land on a port another local app already uses (e.g. 3000).
const PORT = Number(process.env.AVS_REMOTION_PORT || 3220);

let bundlePromise: Promise<string> | null = null;
let browserPromise: ReturnType<typeof openBrowser> | null = null;

function getBundle() {
  bundlePromise ??= bundle({ entryPoint: path.join(ROOT, 'remotion/index.ts'), publicDir: path.join(ROOT, 'public') }).catch((e) => {
    bundlePromise = null;
    throw e;
  });
  return bundlePromise;
}

function getBrowser() {
  browserPromise ??= openBrowser('chrome', { browserExecutable: process.env.AVS_BROWSER || null }).catch((e) => {
    browserPromise = null;
    throw e;
  });
  return browserPromise;
}

async function renderOnce(input: SceneRenderInput, ctx: SceneRenderContext): Promise<void> {
  const serveUrl = await getBundle();
  const puppeteerInstance = await getBrowser();
  const inputProps: SceneClipProps = {
    block: input.block,
    props: input.props,
    ordinal: input.ordinal,
    brand: input.brand,
    durationSec: input.durationSec,
    narrationSrc: input.narrationSrc,
    width: input.width,
    height: input.height,
  };
  try {
    const composition = await selectComposition({ serveUrl, id: 'SceneClip', inputProps, puppeteerInstance, port: PORT });
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: ctx.outFile,
      inputProps,
      puppeteerInstance,
      port: PORT,
      imageFormat: 'jpeg',
      // Every clip gets an audio track (silent if needed) so clips join cleanly.
      enforceAudioTrack: true,
      onProgress: ({ progress }) => ctx.onProgress?.(progress),
    });
  } catch (e) {
    // A crashed browser would fail every later scene; start a fresh one next time.
    const browser = browserPromise;
    browserPromise = null;
    void browser?.then((b) => b.close({ silent: true })).catch(() => {});
    throw e;
  }
}

/** One clip, retried when Remotion's bundle server was not ready (see retry.ts). */
async function render(input: SceneRenderInput, ctx: SceneRenderContext): Promise<void> {
  await retryTransient(() => renderOnce(input, ctx), { onRetry: (e, attempt) => logger.warn(`render attempt ${attempt} failed, retrying`, { error: String((e as Error)?.message ?? e).split('\n')[0] }) });
}

export async function closeRemotion() {
  const browser = browserPromise;
  browserPromise = null;
  await browser?.then((b) => b.close({ silent: true })).catch(() => {});
}

export const remotionRenderer: ToolRenderer = { toolId: 'remotion', render };
