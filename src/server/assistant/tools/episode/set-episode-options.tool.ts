import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { VOICE_IDS, type VoiceId } from '@/core/domain';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';
import { Formats } from './formats';

const Input = z.object({
  episodeId: z.string(),
  topic: z.string().min(3).max(300).optional(),
  goal: z.string().max(300).optional(),
  voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
  formats: Formats.optional(),
  music: z.boolean().optional(),
  musicVolume: z.number().min(0).max(0.6).optional().describe('Âm lượng nhạc nền, mặc định 0.12'),
  autoImages: z.boolean().optional(),
  autoVoice: z.boolean().optional(),
  skillId: z.string().optional(),
});
const Output = z.object({ changed: z.array(z.string()) });

export class SetEpisodeOptions extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'set_episode_options';
  readonly title = 'Đổi thiết lập video';
  readonly description = 'Đổi thiết lập của video: tên/chủ đề/mục tiêu (trước khi duyệt), giọng đọc, khung hình xuất ra, nhạc nền, tự tạo ảnh/giọng khi AI viết xong (autoImages/autoVoice). Đổi skill của video lẻ thì truyền skillId (xoá kịch bản và viết lại).';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  async summarize(a: z.infer<typeof Input>, ctx: ToolContext) {
    return `Đổi thiết lập video ${await episodeLabel(ctx, a.episodeId)}: ${Object.keys(a).filter((k) => k !== 'episodeId' && (a as Record<string, unknown>)[k] !== undefined).join(', ')}`;
  }

  protected async execute({ episodeId, ...patch }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await episodeService.updateOptions(episodeId, defined);
    return { changed: Object.keys(defined) };
  }

  present({ changed }: z.infer<typeof Output>) {
    return `Đã đổi: ${changed.join(', ')}.${changed.includes('voice') ? ' Giọng đã tạo trước đó không còn khớp, cần tạo lại và duyệt lại.' : ''}${changed.includes('skillId') ? ' Kịch bản được viết lại theo skill mới.' : ''}`;
  }
}
