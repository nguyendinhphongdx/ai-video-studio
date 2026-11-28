import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({ skillId: z.string() });
const Output = z.object({ markdown: z.string() });

export class GetSkill extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_skill';
  readonly title = 'Đọc một skill';
  readonly description = 'Đọc toàn văn SKILL.md của một skill thuộc kênh.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize({ skillId }: z.infer<typeof Input>) {
    return `Đọc skill ${skillId}`;
  }

  protected async execute({ skillId }: z.infer<typeof Input>, ctx: ToolContext) {
    return { markdown: (await skillService.get(ctx.channelId, skillId)).markdown };
  }

  present({ markdown }: z.infer<typeof Output>) {
    return markdown;
  }
}
