import path from 'node:path';

import { FORMATS, type Format } from '../../domain/catalog';
import { slugify } from '../../domain/ids';
import { planCues } from '../../audio/sfx';
import type { PipelineStep } from '../step';
import type { AssembleOutput, ProductionContext, RenderOutput } from '../production';

export const assembleStep: PipelineStep<ProductionContext, AssembleOutput> = {
  id: 'assemble',
  label: 'Ghép video, nhạc nền và âm thanh',
  after: ['render'],
  weight: 8,
  inputs: ({ episode, music, sfx }) => ({ title: episode.title, music, sfx, scenes: episode.scenes.map((s) => [s.id, s.block, s.props]) }),
  reusable: async ({ deps }, out) => (await Promise.all(out.renders.map((r) => deps.media.exists(deps.media.absolute(r.filePath))))).every(Boolean),
  async run({ deps, episode, dir, music, sfx }, prev, progress) {
    const { clips, durations } = prev.render as RenderOutput;
    // Sounds go where the scenes' own animations land; each cue becomes a file, level and time in the final mix.
    const cues = sfx && deps.sfx ? planCues(episode.scenes.map((s, i) => ({ id: s.id, block: s.block, props: s.props, ordinal: episode.scenes.slice(0, i + 1).filter((x) => x.block === s.block).length })), durations, (scene, durationSec) => deps.tools.block(scene.block)?.sfx?.({ props: scene.props, ordinal: scene.ordinal, durationSec }), sfx.volume) : [];
    const mix: { file: string; atSec: number; volume: number }[] = [];
    for (const [n, c] of cues.entries()) {
      const file = await deps.sfx!.file(c.kind, n);
      if (file) mix.push({ file, atSec: c.atSec, volume: c.volume });
    }
    const renders: AssembleOutput['renders'] = [];
    const formats = Object.keys(clips) as Format[];
    for (const [i, format] of formats.entries()) {
      const { width, height } = FORMATS[format];
      const out = path.join(dir, 'renders', `${slugify(episode.title)}-${format}.mp4`);
      const durationSec = await deps.video.concat(clips[format]!, out, { width, height, music: music ? { file: music, volume: 0.12 } : undefined, sfx: mix.length ? mix : undefined });
      renders.push({ format, filePath: deps.media.relative(out), durationSec });
      await deps.episodes.addEvent(episode.id, `Dựng xong bản ${FORMATS[format].label}`);
      progress((i + 1) / formats.length);
    }
    return { renders };
  },
};
