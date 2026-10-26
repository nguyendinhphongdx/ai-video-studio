import path from 'node:path';

import type { PipelineStep } from '../step';
import type { AssembleOutput, ProductionContext, RenderOutput, ThumbnailOutput } from '../production';

/** A still from the middle of the first content scene of each render (past the title card). */
export const thumbnailStep: PipelineStep<ProductionContext, ThumbnailOutput> = {
  id: 'thumbnail',
  label: 'Ảnh thu nhỏ',
  after: ['render', 'assemble'],
  weight: 1,
  inputs: () => ({}),
  reusable: async ({ deps }, out) => (await Promise.all(Object.values(out.thumbnails).map((f) => deps.media.exists(deps.media.absolute(f))))).every(Boolean),
  async run({ deps, episode, dir }, prev) {
    const { durations } = prev.render as RenderOutput;
    const { renders } = prev.assemble as AssembleOutput;
    const firstContent = episode.scenes.findIndex((s) => !s.locked && !s.block.endsWith('/title'));
    const index = firstContent >= 0 ? firstContent : 0;
    const at = durations.slice(0, index).reduce((a, b) => a + b, 0) + (durations[index] ?? 2) * 0.6;
    const thumbnails: ThumbnailOutput['thumbnails'] = {};
    for (const r of renders) {
      const out = path.join(dir, 'renders', `thumbnail-${r.format}.jpg`);
      await deps.video.frame(deps.media.absolute(r.filePath), Math.min(at, Math.max(0, r.durationSec - 0.5)), out);
      thumbnails[r.format] = deps.media.relative(out);
    }
    return { thumbnails };
  },
};
