import path from 'node:path';

import { FORMATS, type Format } from '../../domain/catalog';
import { slugify } from '../../domain/ids';
import type { PipelineStep } from '../step';
import type { AssembleOutput, ProductionContext, RenderOutput } from '../production';

export const assembleStep: PipelineStep<ProductionContext, AssembleOutput> = {
  id: 'assemble',
  label: 'Ghép video + nhạc nền',
  after: ['render'],
  weight: 8,
  inputs: ({ episode, music }) => ({ title: episode.title, music }),
  reusable: async ({ deps }, out) => (await Promise.all(out.renders.map((r) => deps.media.exists(deps.media.absolute(r.filePath))))).every(Boolean),
  async run({ deps, episode, dir, music }, prev, progress) {
    const { clips } = prev.render as RenderOutput;
    const renders: AssembleOutput['renders'] = [];
    const formats = Object.keys(clips) as Format[];
    for (const [i, format] of formats.entries()) {
      const { width, height } = FORMATS[format];
      const out = path.join(dir, 'renders', `${slugify(episode.title)}-${format}.mp4`);
      const durationSec = await deps.video.concat(clips[format]!, out, { width, height, music: music ? { file: music, volume: 0.12 } : undefined });
      renders.push({ format, filePath: deps.media.relative(out), durationSec });
      await deps.episodes.addEvent(episode.id, `Dựng xong bản ${FORMATS[format].label}`);
      progress((i + 1) / formats.length);
    }
    return { renders };
  },
};
