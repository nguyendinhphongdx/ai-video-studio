import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { marketService } from '@/server/modules/skill/market.service';
import { skillService } from '@/server/modules/skill/skill.service';

import { asJson } from '../util';

const Input = z.object({ market: z.boolean().default(false) });
const Output = z.object({
  skills: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), tools: z.array(z.string()), scenes: z.string(), source: z.string() })),
  market: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), tools: z.array(z.string()), installedAs: z.unknown() })).optional(),
});

export class ListSkills extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_skills';
  readonly title = 'Xem skill';
  readonly description = 'Các skill kênh đang có (id, tên, mô tả, công cụ, nguồn). market=true để xem thêm các skill trong market có thể cài (kèm đã cài chưa).';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize({ market }: z.infer<typeof Input>) {
    return market ? 'Xem skill của kênh và market' : 'Xem skill của kênh';
  }

  protected async execute({ market }: z.infer<typeof Input>, ctx: ToolContext) {
    const skills = (await skillService.list(ctx.channelId)).map((s) => ({ id: s.id, name: s.name, description: s.description, tools: s.tools, scenes: `${s.scenes.min}-${s.scenes.max}`, source: s.source }));
    const shop = market ? (await marketService.list(ctx.channelId)).map((m) => ({ id: m.id, name: m.name, description: m.description, tools: m.tools, installedAs: m.installedAs })) : undefined;
    return { skills, market: shop };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 8000);
  }
}
