import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({ skillId: z.string() });
const Output = z.object({ skillId: z.string() });

export class UpgradeSkill extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'upgrade_skill';
  readonly title = 'Nâng cấp skill từ market';
  readonly description = 'Đưa một skill cài từ market lên bản mới nhất của market. THAY bản của dự án, kể cả phần đã tự sửa: đọc get_skill và hỏi người dùng trước.';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize({ skillId }: z.infer<typeof Input>) {
    return `Nâng cấp skill “${skillId}”`;
  }

  protected async execute({ skillId }: z.infer<typeof Input>, ctx: ToolContext) {
    await skillService.upgrade(ctx.channelId, skillId);
    return { skillId };
  }

  present({ skillId }: z.infer<typeof Output>) {
    return `Đã nâng cấp skill "${skillId}" lên bản mới nhất.`;
  }
}
