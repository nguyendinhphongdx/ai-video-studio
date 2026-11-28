import { z } from 'zod';

import { StudioTool } from '@/core/assistant/tool';
import { toolCatalog } from '@/tools/registry';

const Input = z.object({});
const Output = z.object({ catalog: z.string() });

export class ListBlocks extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_blocks';
  readonly title = 'Xem công cụ và khối dựng';
  readonly description = 'Danh sách các công cụ dựng và khối cảnh có thể dùng trong skill, kèm cách dùng và các thuộc tính của từng khối. Đọc trước khi soạn skill.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem các công cụ và khối dựng';
  }

  protected async execute() {
    const catalog = toolCatalog
      .tools()
      .map((t) => `@${t.id}: ${t.summary}\n${t.blocks.map((b) => `  - @${t.id}/${b.id} (${b.name}): ${b.aiGuide} Thuộc tính: ${b.fields.map((f) => (f.options ? `${f.key} (${f.options.map((o) => `${o.value}=${o.label}`).join(', ')})` : f.key)).join('; ') || '(không có)'}${b.image ? '. Có ảnh AI: phong cách ảnh lấy từ imageStyle của skill' : ''}`).join('\n')}`)
      .join('\n');
    return { catalog };
  }

  present({ catalog }: z.infer<typeof Output>) {
    return catalog;
  }
}
