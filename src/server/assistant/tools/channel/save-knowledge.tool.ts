import { z } from 'zod';

import { KNOWLEDGE_GUIDE } from '@/core/assistant/guides';
import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';

const Input = z.object({ markdown: z.string().min(1).max(60_000), note: z.string().max(200).default('') });
const Output = z.object({ version: z.number().optional() });

export class SaveKnowledge extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'save_knowledge';
  readonly title = 'Lưu tri thức của kênh';
  readonly description = `Lưu tri thức của kênh thành một phiên bản mới (truyền TOÀN BỘ văn bản Markdown). Video đã viết trước đó sẽ được gợi ý viết lại. ${KNOWLEDGE_GUIDE}`;
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ markdown, note }: z.infer<typeof Input>) {
    return `Lưu tri thức của kênh (${markdown.length} ký tự)${note ? `: ${note}` : ''}`;
  }

  protected async execute({ markdown, note }: z.infer<typeof Input>, ctx: ToolContext) {
    const saved = await knowledgeService.save(ctx.channelId, markdown, note);
    return { version: saved.current?.version };
  }

  present({ version }: z.infer<typeof Output>) {
    return `Đã lưu tri thức, phiên bản v${version}.`;
  }
}
