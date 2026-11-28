import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';

const Input = z.object({});
const Output = z.object({ knowledge: z.object({ version: z.number(), markdown: z.string() }).nullable() });

export class GetKnowledge extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_knowledge';
  readonly title = 'Đọc tri thức của kênh';
  readonly description = 'Đọc tri thức hiện tại của kênh (toàn văn, kèm số phiên bản).';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Đọc tri thức của kênh';
  }

  protected async execute(_input: z.infer<typeof Input>, ctx: ToolContext) {
    const k = (await knowledgeService.get(ctx.channelId)).current;
    return { knowledge: k ? { version: k.version, markdown: k.markdown } : null };
  }

  present({ knowledge }: z.infer<typeof Output>) {
    return knowledge ? `Phiên bản ${knowledge.version}:\n${knowledge.markdown}` : 'Kênh chưa có tri thức.';
  }
}
