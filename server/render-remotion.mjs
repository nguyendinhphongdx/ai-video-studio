// Remotion renderer: bundles remotion/ once, then renders Video with the project's props.
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const ROOT = path.resolve(import.meta.dirname, "..");
let bundlePromise = null;

const getBundle = () =>
  (bundlePromise ??= bundle({
    entryPoint: path.join(ROOT, "remotion/index.ts"),
    publicDir: path.join(ROOT, "public"),
  }).catch((e) => {
    bundlePromise = null;
    throw e;
  }));

/**
 * props: VideoProps (spec, timeline, audio URLs, width, height, music)
 */
export async function renderWithRemotion(props, outFile, { onProgress } = {}) {
  const serveUrl = await getBundle();
  const browserExecutable = process.env.AVS_BROWSER || null;
  // Fixed port so Remotion's bundle server doesn't land on a port another app already uses (e.g. 3000).
  const port = Number(process.env.AVS_REMOTION_PORT || 3220);
  const composition = await selectComposition({ serveUrl, id: "Main", inputProps: props, browserExecutable, port });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outFile,
    inputProps: props,
    browserExecutable,
    port,
    imageFormat: "jpeg",
    onProgress: ({ progress }) => onProgress?.(progress),
  });
  return outFile;
}
