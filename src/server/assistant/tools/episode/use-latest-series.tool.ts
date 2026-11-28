import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ seriesVersion: z.number().nullable() });

export class UseLatestSeries extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'use_latest_series';
  readonly title = 'Cập nhật tập theo series mới';
  readonly description = 'Chuyển một tập đã viết sang phiên bản series mới nhất (nhân vật, hành động, bible, khung mới). Kịch bản giữ nguyên, không tạo lại gì.';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Cập nhật theo series mới cho video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    return { seriesVersion: (await episodeService.useLatestSeries(episodeId)).episode.seriesVersion };
  }

  present({ seriesVersion }: z.infer<typeof Output>) {
    return `Tập đang dùng series bản ${seriesVersion}.`;
  }
}
