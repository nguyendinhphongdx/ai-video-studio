import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { seriesService } from '@/server/modules/series/series.service';

import { ownSeries } from '../util';

const Input = z.object({ seriesId: z.string(), episodeIds: z.array(z.string()).min(1).max(60) });
const Output = z.object({ reordered: z.number() });

export class ReorderSeriesEpisodes extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'reorder_series_episodes';
  readonly title = 'Đổi thứ tự lộ trình';
  readonly description = 'Đổi thứ tự các tập còn trong lộ trình (trạng thái planned): truyền episodeIds theo thứ tự mới. Tập đã bắt đầu giữ nguyên số.';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize({ episodeIds }: z.infer<typeof Input>) {
    return `Đổi thứ tự ${episodeIds.length} tập`;
  }

  protected async execute({ seriesId, episodeIds }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownSeries(ctx, seriesId);
    await seriesService.reorder(seriesId, episodeIds);
    return { reordered: episodeIds.length };
  }

  present({ reordered }: z.infer<typeof Output>) {
    return `Đã đổi thứ tự ${reordered} tập.`;
  }
}
