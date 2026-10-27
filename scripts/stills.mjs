// Dev tool: bundle the Remotion project once and render stills of scenes, to look at a block or shot without running
// the whole app. Usage: node scripts/stills.mjs <jobs.json> <outDir>
//   (a job may carry `brand` fields, for example an introDesign, to override the sample brand)
//   jobs.json = [{ "name": "kinetic-rise", "block": "remotion/kinetic", "props": {...}, "frame": 60, "ordinal": 1, "width": 1920, "height": 1080, "durationSec": 6, "palette": ["#0F172A", "#F59E0B"] }]
import fs from 'node:fs';
import path from 'node:path';

import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [jobsFile, outDir] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const root = process.cwd();
const serveUrl = await bundle({ entryPoint: path.join(root, 'remotion/index.ts'), publicDir: path.join(root, 'public') });
for (const job of jobs) {
  const inputProps = {
    block: job.block,
    props: job.props ?? {},
    ordinal: job.ordinal ?? 1,
    brand: { name: 'Bí ẩn quanh ta', font: 'Baloo2', logoSrc: null, avatarSrc: null, introDesign: null, outroDesign: null, introArtSrc: null, outroArtSrc: null, outroText: 'Hẹn gặp lại', subscribeText: 'ĐĂNG KÝ', palette: job.palette ?? ['#0F172A', '#F59E0B', '#38BDF8'], ...(job.brand ?? {}) },
    durationSec: job.durationSec ?? 6,
    narrationSrc: null,
    width: job.width ?? 1920,
    height: job.height ?? 1080,
  };
  const composition = await selectComposition({ serveUrl, id: 'SceneClip', inputProps, port: 3291 });
  await renderStill({ composition, serveUrl, inputProps, frame: job.frame ?? 30, output: path.join(outDir, `${job.name}.png`), port: 3291 });
  console.log('still', job.name);
}
