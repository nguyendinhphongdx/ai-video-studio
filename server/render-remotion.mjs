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
  const composition = await selectComposition({ serveUrl, id: "Main", inputProps: props, browserExecutable });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outFile,
    inputProps: props,
    browserExecutable,
    imageFormat: "jpeg",
    onProgress: ({ progress }) => onProgress?.(progress),
  });
  return outFile;
}
