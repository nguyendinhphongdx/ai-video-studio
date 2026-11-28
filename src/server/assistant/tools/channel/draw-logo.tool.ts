import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { channelService } from '@/server/modules/channel/channel.service';
import { usageService } from '@/server/modules/usage/usage.service';

const Input = z.object({ prompt: z.string().max(400).default('') });
const Output = z.object({ queued: z.literal(true) });

export class DrawLogo extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'draw_logo';
  readonly title = 'Vẽ bản nháp logo';
  readonly description = 'Vẽ một bản nháp logo bằng AI cho dự án (tốn tiền 1 ảnh, chạy nền ~20 giây). prompt bằng tiếng Anh, tả hình biểu tượng, không chữ; để trống thì dùng ý tưởng logo đã có của dự án. Logo CHƯA đổi: người dùng xem bản nháp rồi tự bấm "Dùng logo này" ở Cài đặt dự án, mục Thương hiệu.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize() {
    const { usd } = await usageService.estimate({ images: 1, texts: [], voice: '' });
    return `Vẽ 1 bản nháp logo (${usd == null ? 'chưa rõ giá' : `khoảng $${usd.toFixed(2)}`})`;
  }

  protected async execute({ prompt }: z.infer<typeof Input>, ctx: ToolContext) {
    await channelService.requestLogo(ctx.channelId, prompt);
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker vẽ bản nháp logo. Khoảng 20 giây nữa xem ở Cài đặt dự án, mục Thương hiệu, rồi bấm "Dùng logo này" nếu ưng.';
  }
}
