import { z } from 'zod';

import { DESIGN_GUIDE } from '@/core/assistant/guides';
import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { designSimilarity, normalizeDesign, SceneDesignSchema } from '@/core/domain/design';
import { channelService } from '@/server/modules/channel/channel.service';

import { channelInput } from './channel-input';

const Input = z.object({ design: SceneDesignSchema });
const Output = z.object({ layers: z.number(), seconds: z.number(), likeBefore: z.number().nullable().describe('0 to 1: how much it looks like the design it replaced'), artPrompt: z.string().nullable().describe('Set when the design needs an AI background picture') });

/** The intro and the outro are saved the same way; each subclass only says which. */
export abstract class DesignTool extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  protected abstract readonly kind: 'intro' | 'outro';
  protected abstract readonly label: string;
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  protected static describe(label: string) {
    return `Lưu thiết kế cảnh ${label} RIÊNG của kênh (thay toàn bộ thiết kế ${label} hiện có). Truyền cả thiết kế đầy đủ. ${DESIGN_GUIDE}`;
  }

  summarize({ design }: z.infer<typeof Input>) {
    return `Lưu thiết kế ${this.label} của kênh (${design.layers.length} lớp${design.artPrompt ? ', có ảnh nền AI' : ''})`;
  }

  protected async execute({ design }: z.infer<typeof Input>, ctx: ToolContext) {
    const c = await channelService.get(ctx.channelId);
    const clean = normalizeDesign(design, c.palette);
    const field = this.kind === 'intro' ? 'introDesign' : 'outroDesign';
    await channelService.update(c.id, channelInput(c, { [field]: clean }));
    const before = c[field];
    return { layers: clean.layers.length, seconds: clean.seconds, likeBefore: before ? designSimilarity(before, clean) : null, artPrompt: clean.layers.some((l) => l.kind === 'art') ? clean.artPrompt : null };
  }

  present({ layers, seconds, likeBefore, artPrompt }: z.infer<typeof Output>) {
    const percent = likeBefore === null ? 0 : Math.round(likeBefore * 100);
    const sameNote = likeBefore !== null && likeBefore >= 0.7 ? ` CẢNH BÁO: thiết kế mới giống bản cũ ${percent}% (cùng bố cục, nền, vị trí các lớp), người dùng sẽ thấy gần như không đổi. Nếu họ muốn thay đổi rõ rệt, hãy thiết kế lại bằng một kiểu bố cục KHÁC (xem các kiểu bố cục trong hướng dẫn) rồi gọi lại công cụ này.` : '';
    return `Đã lưu thiết kế ${this.label}: ${layers} lớp, ${seconds} giây.${likeBefore !== null ? ` Giống bản cũ ${percent}%.` : ''}${sameNote}${artPrompt !== null ? ` Thiết kế dùng ảnh nền AI: gọi generate_channel_art (kind=${this.kind}) với prompt "${artPrompt}" để tạo ảnh.` : ''}`;
  }
}
