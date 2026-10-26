// Renders @hyperframes blocks. For a scene it writes a small HTML + GSAP project, then runs the HyperFrames CLI.
// The project folder is kept, so the scene can be opened in HyperFrames Studio and tweaked by hand.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { UserFacingError } from '@/core/domain/errors';
import type { SceneRenderContext, SceneRenderInput, ToolRenderer } from '@/core/tools/tool';

import { HYPERFRAMES_VERSION as HF_VERSION } from './tool';

const ROOT = process.cwd();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};
const headingSize = (t: string) => {
  const len = [...t].length;
  return len <= 2 ? 380 : len <= 4 ? 250 : len <= 7 ? 170 : 120;
};
const emojiSize = (c: number) => (c <= 1 ? 300 : c <= 3 ? 210 : c <= 6 ? 160 : 120);

interface CardsProps {
  heading: string;
  emoji: string;
  count: number;
  caption: string;
  color: string;
}

function sceneHtml(p: CardsProps, input: SceneRenderInput, hasVoice: boolean): string {
  const { width, height, durationSec: d } = input;
  const u = Math.min(width, height) / 1080;
  const portrait = height > width;
  const emojis = Array.from({ length: p.count }, () => `<span class="emoji" style="font-size:${emojiSize(p.count) * u}px">${esc(p.emoji)}</span>`).join('');
  return `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8" />
<script src="assets/gsap.min.js"></script>
<style>
  @font-face { font-family: "Baloo2"; src: url("assets/Baloo2.ttf"); font-weight: 400 800; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: #000; }
  #root { width: 100%; height: 100%; position: relative; font-family: "Baloo2", sans-serif; }
  .inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .col { display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .emojis { display: flex; flex-wrap: wrap; justify-content: center; }
  .emoji { display: inline-block; line-height: 1.1; }
  .heading { text-align: center; font-weight: 800; line-height: 1.05; color: #fff; text-shadow: -12px -12px 0 #1E3A6B, 12px -12px 0 #1E3A6B, -12px 12px 0 #1E3A6B, 12px 12px 0 #1E3A6B, 0 18px 0 rgba(0,0,0,.18); }
  .caption { color: #fff; font-weight: 800; text-align: center; text-shadow: -6px -6px 0 #1E3A6B, 6px -6px 0 #1E3A6B, -6px 6px 0 #1E3A6B, 6px 6px 0 #1E3A6B, 0 12px 0 rgba(0,0,0,.18); }
</style></head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${r3(d)}" data-width="${width}" data-height="${height}">
    <div id="scene" class="clip" data-start="0" data-duration="${r3(d)}" data-track-index="0">
      <div class="inner" style="flex-direction:${portrait ? 'column' : 'row'};background:radial-gradient(circle at 50% 30%, ${shade(p.color, 0.15)}, ${shade(p.color, -0.15)});padding:${80 * u}px ${100 * u}px;gap:${40 * u}px">
        <div class="heading" style="font-size:${headingSize(p.heading) * u}px;${portrait ? '' : `min-width:${560 * u}px;`}">${esc(p.heading)}</div>
        <div class="col" style="${portrait ? '' : 'flex:1;'}gap:${40 * u}px">
          <div class="emojis" style="gap:${20 * u}px;max-width:${(portrait ? 900 : 1100) * u}px">${emojis}</div>
          <div class="caption" style="font-size:${96 * u}px">${esc(p.caption)}</div>
        </div>
      </div>
    </div>
    ${hasVoice ? `<audio id="vo" src="assets/vo.mp3" data-start="0.2" data-track-index="2" data-volume="1"></audio>` : ''}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#scene .inner", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    tl.fromTo("#scene .heading", { scale: 0, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.5)" }, 0);
    tl.fromTo("#scene .emoji", { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.27 }, 0.35);
    tl.fromTo("#scene .caption", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, ${r3(0.8 + p.count * 0.27)});
    tl.to("#scene .inner", { opacity: 0, duration: 0.25 }, ${r3(d - 0.3)});
    window.__timelines["main"] = tl;
    tl.seek(0);
  </script>
</body></html>
`;
}

async function writeDataUri(uri: string, file: string) {
  const m = /^data:[^;]+;base64,(.*)$/s.exec(uri);
  if (!m) throw new Error('narrationSrc must be a base64 data URI');
  await fs.writeFile(file, Buffer.from(m[1]!, 'base64'));
}

async function render(input: SceneRenderInput, ctx: SceneRenderContext): Promise<void> {
  if (input.block !== 'hyperframes/cards') throw new UserFacingError(`HyperFrames chưa hỗ trợ khối @${input.block}`);
  const dir = ctx.workDir;
  await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
  await fs.copyFile(path.join(ROOT, 'node_modules/gsap/dist/gsap.min.js'), path.join(dir, 'assets/gsap.min.js'));
  await fs.copyFile(path.join(ROOT, 'public/fonts/Baloo2.ttf'), path.join(dir, 'assets/Baloo2.ttf'));
  if (input.narrationSrc) await writeDataUri(input.narrationSrc, path.join(dir, 'assets/vo.mp3'));
  await fs.writeFile(path.join(dir, 'index.html'), sceneHtml(input.props as unknown as CardsProps, input, Boolean(input.narrationSrc)));
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'avs-scene', private: true, type: 'module', scripts: { dev: `npx --yes hyperframes@${HF_VERSION} preview` } }, null, 2),
  );
  await fs.mkdir(path.dirname(ctx.outFile), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1', ...(process.env.AVS_BROWSER ? { PRODUCER_HEADLESS_SHELL_PATH: process.env.AVS_BROWSER } : {}) };
    const child = spawn('npx', ['--yes', `hyperframes@${HF_VERSION}`, 'render', '-o', ctx.outFile], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      log = (log + text).slice(-8000);
      for (const m of text.matchAll(/@hf-progress (\{.*\})/g)) {
        try {
          ctx.onProgress?.(JSON.parse(m[1]!).pct / 100);
        } catch {}
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`HyperFrames render failed (exit ${code}):\n${log.slice(-1500)}`))));
  });
}

export const hyperframesRenderer: ToolRenderer = { toolId: 'hyperframes', render };

