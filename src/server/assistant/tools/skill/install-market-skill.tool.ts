import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({ marketId: z.string() });
const Output = z.object({ skillId: z.string(), name: z.string() });

export class InstallMarketSkill extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'install_market_skill';
  readonly title = 'Cài skill từ market';
  readonly description = 'Cài một skill từ market về kênh (sao chép thành skill riêng của kênh, sau đó sửa tự do). Xem list_skills market=true để biết mã.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ marketId }: z.infer<typeof Input>) {
    return `Cài skill “${marketId}” từ market về kênh`;
  }

  protected async execute({ marketId }: z.infer<typeof Input>, ctx: ToolContext) {
    const d = await skillService.install(ctx.channelId, marketId);
    return { skillId: d.skill.id, name: d.skill.name };
  }

  present({ skillId, name }: z.infer<typeof Output>) {
    return `Đã cài về kênh với mã "${skillId}" (${name}).`;
  }
}
