import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { seriesService } from '@/server/modules/series/series.service';

import { asJson } from '../util';

const Input = z.object({});
const Output = z.object({ series: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), version: z.number(), skillId: z.string(), stats: z.unknown() })) });

export class ListSeries extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_series';
  readonly title = 'Xem các series';
  readonly description = 'Các series của kênh với tiến độ (số tập theo trạng thái).';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem các series của kênh';
  }

  protected async execute(_input: z.infer<typeof Input>, ctx: ToolContext) {
    const list = await seriesService.list(ctx.channelId);
    return { series: list.map((s) => ({ id: s.id, name: s.name, status: s.status, version: s.currentVersion, skillId: s.rules.skillId, stats: s.stats })) };
  }

  present({ series }: z.infer<typeof Output>) {
    return asJson(series);
  }
}
