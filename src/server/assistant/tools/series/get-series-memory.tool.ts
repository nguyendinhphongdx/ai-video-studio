import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { seriesService } from '@/server/modules/series/series.service';

import { asJson, ownSeries } from '../util';

const Input = z.object({ seriesId: z.string() });
const Output = z.object({ season: z.unknown(), episodes: z.array(z.unknown()) });

export class GetSeriesMemory extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_series_memory';
  readonly title = 'Xem bộ nhớ series';
  readonly description = 'Bộ nhớ của series mà AI đọc khi viết tập mới: tóm tắt cả mùa và từng tập (khái niệm, ví dụ, từ vựng, câu đùa đã dùng).';
  readonly risk = 'read';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem bộ nhớ series';
  }

  protected async execute({ seriesId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownSeries(ctx, seriesId);
    return await seriesService.memory(seriesId);
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 14000);
  }
}
