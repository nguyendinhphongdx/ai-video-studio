import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { VOICE_IDS, type VoiceId } from '@/core/domain';
import { episodeService } from '@/server/modules/episode/episode.service';

import { Formats } from './formats';

const Input = z.object({
  topic: z.string().min(3).max(300),
  goal: z.string().max(300).default(''),
  notes: z.string().max(1000).default(''),
  skillId: z.string().optional(),
  seriesId: z.string().optional(),
  formats: Formats.default(['landscape']),
  voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
  sceneCount: z.number().int().min(2).max(20).nullable().default(null),
});
const Output = z.object({ id: z.string(), topic: z.string(), skillId: z.string() });

export class CreateEpisode extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'create_episode';
  readonly title = 'Tạo video';
  readonly description = 'Tạo một video mới (chưa viết kịch bản). skillId là skill của kênh (bỏ trống thì dùng skill mặc định của kênh); seriesId nếu là một tập của series (dùng skill của series). Sau đó gọi write_script để AI viết kịch bản.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ topic }: z.infer<typeof Input>) {
    return `Tạo video “${topic}”`;
  }

  protected async execute(a: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await episodeService.create({ channelId: ctx.channelId, seriesId: a.seriesId ?? null, skillId: a.skillId, topic: a.topic, goal: a.goal, notes: a.notes, formats: a.formats, voice: a.voice, music: true, sceneCount: a.sceneCount, planOnly: true });
    return { id: v.episode.id, topic: v.episode.topic, skillId: v.episode.skillId };
  }

  present({ id, topic, skillId }: z.infer<typeof Output>) {
    return `Đã tạo video "${topic}" (id ${id}, skill ${skillId}). Chưa có kịch bản: gọi write_script để AI viết.`;
  }
}
