import { z } from 'zod';

import { GUIDE, GUIDE_TOPICS } from '@/core/assistant/studio-guide';
import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { configService } from '@/server/modules/config/config.service';
import { settingsService } from '@/server/modules/settings/settings.service';

const TOPICS = [...GUIDE_TOPICS, 'hien-trang'] as const;
const Input = z.object({ topic: z.enum(TOPICS).optional().describe('Bỏ trống để đọc tất cả') });
const Output = z.object({ markdown: z.string() });

const LEVELS = {
  read: 'Chỉ đọc. Chỉ được xem.',
  edit: 'Được sửa. Được xem và sửa; không được làm việc tốn tiền, xoá, duyệt video.',
  full: 'Toàn quyền. Được làm cả việc tốn tiền và xoá; studio không hỏi lại, nên hãy tự hỏi người dùng trước.',
} as const;

const ready = (ok: boolean) => (ok ? 'dùng được' : 'chưa cài');

export class GetStudioGuide extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_studio_guide';
  readonly title = 'Đọc hướng dẫn studio';
  readonly description = 'ĐỌC TRƯỚC TIÊN. Studio là gì, có tính năng gì, khái niệm, luồng làm việc, cái gì cần có trước cái gì, lưu ý, và hiện trạng (đã cài gì, mã kết nối này được làm gì).';
  readonly risk = 'read';
  override readonly scope = 'workspace';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Đọc hướng dẫn studio';
  }

  protected async execute({ topic }: z.infer<typeof Input>, ctx: ToolContext) {
    const wanted = topic ? [topic] : TOPICS;
    const parts = await Promise.all(wanted.map(async (t) => (t === 'hien-trang' ? this.now(ctx) : GUIDE[t])));
    return { markdown: parts.join('\n\n') };
  }

  present({ markdown }: z.infer<typeof Output>) {
    return markdown;
  }

  private async now(ctx: ToolContext) {
    const [config, image] = await Promise.all([configService.get(), settingsService.publicImage()]);
    return `## Hiện trạng
- Mã kết nối này: ${LEVELS[ctx.caller?.access ?? 'read']}
- AI viết: ${ready(config.llm.ready)} (${config.llm.providerLabel}, ${config.llm.model})
- Tạo ảnh: ${ready(image.ready)}
- Giọng Edge (miễn phí): ${ready(config.tts)}. Giọng Google: ${ready(config.ttsGoogle)}.`;
  }
}
