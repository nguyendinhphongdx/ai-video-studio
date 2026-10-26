import { UserFacingError } from '../../domain/errors';
import { needsVoice, voiceHashOf } from '../../scenes/assets';
import type { PipelineStep } from '../step';
import type { ProductionContext, VoiceOutput } from '../production';

/**
 * Collects the voices made (and approved) scene by scene. Production never calls a voice provider: a scene whose
 * voice is missing or no longer matches its text must be regenerated in the scenes step.
 */
export const voiceStep: PipelineStep<ProductionContext, VoiceOutput> = {
  id: 'voice',
  label: 'Giọng đọc các cảnh',
  after: [],
  weight: 2,
  inputs: ({ episode }) => ({ voice: episode.voice, lines: episode.scenes.map((s) => [s.id, s.narration, s.assets.voicePath]) }),
  reusable: async ({ deps }, out) => (await Promise.all(Object.values(out.lines).map((l) => deps.media.exists(l.file)))).every(Boolean),
  async run({ deps, episode }) {
    const lines: VoiceOutput['lines'] = {};
    for (const [i, s] of episode.scenes.entries()) {
      if (!needsVoice(s)) continue;
      if (!s.assets.voicePath || s.assets.voiceHash !== voiceHashOf(episode.voice, s.narration) || s.assets.voiceSeconds === null) throw new UserFacingError(`Cảnh ${i + 1} chưa có giọng đọc khớp với lời đọc hiện tại. Tạo giọng cho cảnh đó rồi duyệt lại.`);
      const file = deps.media.absolute(s.assets.voicePath);
      if (!(await deps.media.exists(file))) throw new UserFacingError(`Giọng đọc của cảnh ${i + 1} đã bị mất. Tạo lại giọng cho cảnh đó.`);
      lines[s.id] = { file, seconds: s.assets.voiceSeconds };
    }
    return { lines };
  },
};
