import { z } from 'zod';

import { SKILL_GUIDE } from '@/core/assistant/guides';
import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({ skillId: z.string().min(2).max(48), markdown: z.string().min(40).max(100_000), create: z.boolean().default(false) });
const Output = z.object({ skillId: z.string(), name: z.string(), scenes: z.object({ min: z.number(), max: z.number() }), issues: z.array(z.string()) });

export class SaveSkill extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'save_skill';
  readonly title = 'Lưu skill';
  readonly description = `Tạo skill mới hoặc ghi đè skill của kênh bằng toàn bộ nội dung SKILL.md. ${SKILL_GUIDE}`;
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ skillId, create }: z.infer<typeof Input>) {
    return `${create ? 'Tạo' : 'Lưu'} skill “${skillId}”`;
  }

  protected async execute({ skillId, markdown, create }: z.infer<typeof Input>, ctx: ToolContext) {
    const d = await skillService.save(ctx.channelId, skillId, markdown, { create, source: 'ai' });
    return { skillId: d.skill.id, name: d.skill.name, scenes: { min: d.skill.scenes.min, max: d.skill.scenes.max }, issues: d.issues.map((i) => i.message) };
  }

  present({ skillId, name, scenes, issues }: z.infer<typeof Output>) {
    return `Đã lưu skill "${skillId}" (${name}), ${scenes.min}-${scenes.max} cảnh. ${issues.length ? `Lưu ý: ${issues.join('; ')}` : ''}`;
  }
}
