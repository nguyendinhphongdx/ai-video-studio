import path from 'node:path';

import type { PipelineStep } from '../step';
import type { ProductionContext, VoiceOutput } from '../production';

export const voiceStep: PipelineStep<ProductionContext, VoiceOutput> = {
  id: 'voice',
  label: 'Lồng tiếng',
  after: [],
  weight: 15,
  inputs: ({ episode }) => ({ voice: episode.voice, lines: episode.scenes.map((s) => [s.id, s.narration]) }),
  reusable: async ({ deps }, out) => (await Promise.all(Object.values(out.lines).map((l) => deps.media.exists(l.file)))).every(Boolean),
  async run({ deps, episode, dir }, _prev, progress) {
    const lines: VoiceOutput['lines'] = {};
    const scenes = episode.scenes;
    for (const [i, s] of scenes.entries()) {
      if (s.narration.trim()) {
        const file = path.join(dir, 'voice', `${i}-${s.id}.mp3`);
        lines[s.id] = { file, seconds: await deps.tts.synthesize(s.narration, episode.voice, file) };
      }
      progress((i + 1) / scenes.length);
    }
    await deps.episodes.addEvent(episode.id, `Đã lồng tiếng ${Object.keys(lines).length} cảnh`);
    return { lines };
  },
};
