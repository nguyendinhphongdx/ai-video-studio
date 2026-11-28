import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { usageService } from '@/server/modules/usage/usage.service';

import { asJson } from '../util';

const Input = z.object({ range: z.enum(['today', '7d', '30d', 'month', 'all']).default('month') });
const Output = z.object({ range: z.string(), fxUsdVnd: z.number(), totals: z.unknown(), byPurpose: z.unknown(), byModel: z.unknown(), topEpisodes: z.unknown(), budgets: z.unknown() });

export class GetCostSummary extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_cost_summary';
  readonly title = 'Xem chi phí';
  readonly description = 'Chi phí AI đã ghi sổ của dự án trong một khoảng (today, 7d, 30d, month, all): tổng, theo việc, theo model, video tốn nhất và ngân sách. Đơn vị USD.';
  readonly risk = 'read';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize({ range }: z.infer<typeof Input>) {
    return `Xem chi phí (${range})`;
  }

  protected async execute({ range }: z.infer<typeof Input>, ctx: ToolContext) {
    const s = await usageService.summary(range, ctx.channelId);
    return { range, fxUsdVnd: s.fxUsdVnd, totals: s.totals, byPurpose: s.byPurpose, byModel: s.byModel, topEpisodes: s.topEpisodes, budgets: s.budgets };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 8000);
  }
}
