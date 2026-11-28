import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({ skillId: z.string() });
const Output = z.object({ skillId: z.string() });

export class DeleteSkill extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'delete_skill';
  readonly title = 'Xoá skill';
  readonly description = 'Xoá một skill khỏi kênh (không xoá được skill đang được video/series dùng hoặc là mặc định).';
  readonly risk = 'destructive';
  readonly input = Input;
  readonly output = Output;

  summarize({ skillId }: z.infer<typeof Input>) {
    return `Xoá skill “${skillId}” khỏi kênh`;
  }

  protected async execute({ skillId }: z.infer<typeof Input>, ctx: ToolContext) {
    await skillService.remove(ctx.channelId, skillId);
    return { skillId };
  }

  present({ skillId }: z.infer<typeof Output>) {
    return `Đã xoá skill "${skillId}".`;
  }
}
