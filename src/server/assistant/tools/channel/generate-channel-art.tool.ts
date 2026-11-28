import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { channelService } from '@/server/modules/channel/channel.service';

const Input = z.object({ kind: z.enum(['intro', 'outro']), prompt: z.string().max(400).default('') });
const Output = z.object({ queued: z.literal(true) });

export class GenerateChannelArt extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'generate_channel_art';
  readonly title = 'Tạo ảnh nền cho kênh';
  readonly description = 'Tạo ảnh nền AI cho cảnh mở đầu hoặc kết của kênh (tốn tiền ảnh, chạy nền ~20 giây). prompt bằng tiếng Anh, không chữ trong ảnh; để trống thì dùng artPrompt trong thiết kế.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  summarize({ kind }: z.infer<typeof Input>) {
    return `Tạo ảnh nền AI cho ${kind === 'intro' ? 'mở đầu' : 'kết'} của kênh`;
  }

  protected async execute({ kind, prompt }: z.infer<typeof Input>, ctx: ToolContext) {
    await channelService.requestArt(ctx.channelId, kind, prompt);
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker tạo ảnh nền. Ảnh sẽ hiện ở trang kênh sau khoảng 20 giây.';
  }
}
