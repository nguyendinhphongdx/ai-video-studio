import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { asJson } from '../util';

const Input = z.object({ seriesId: z.string().optional(), status: z.enum(['planned', 'draft', 'script_review', 'producing', 'video_review', 'published']).optional() });
const Output = z.object({ videos: z.array(z.object({ id: z.string(), number: z.number().nullable(), seriesId: z.string().nullable(), topic: z.string(), title: z.string(), status: z.string(), approved: z.string(), job: z.string().nullable() })) });

export class ListEpisodes extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_episodes';
  readonly title = 'Xem các video';
  readonly description = 'Các video của kênh (có thể lọc theo series hoặc trạng thái): id, tên, trạng thái, tiến độ duyệt cảnh.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem các video của kênh';
  }

  protected async execute({ seriesId, status }: z.infer<typeof Input>, ctx: ToolContext) {
    const list = (await episodeService.list({ channelId: ctx.channelId, seriesId })).filter((v) => !status || v.episode.status === status);
    return { videos: list.slice(0, 40).map((v) => ({ id: v.episode.id, number: v.episode.number, seriesId: v.episode.seriesId, topic: v.episode.topic, title: v.episode.title, status: v.episode.status, approved: `${v.episode.scenes.filter((s) => s.approved).length}/${v.episode.scenes.length}`, job: v.job?.state ?? null })) };
  }

  present({ videos }: z.infer<typeof Output>) {
    return asJson(videos);
  }
}
