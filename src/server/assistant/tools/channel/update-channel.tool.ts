import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { BRAND_FONT_IDS, VOICE_IDS, type BrandFont, type VoiceId } from '@/core/domain';
import { channelService } from '@/server/modules/channel/channel.service';
import { skillService } from '@/server/modules/skill/skill.service';

import { channelInput } from './channel-input';

const Input = z.object({
  name: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
  audience: z.string().max(300).optional(),
  style: z.string().max(500).optional(),
  voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).optional(),
  palette: z.array(z.string()).min(1).max(6).optional(),
  font: z.enum(BRAND_FONT_IDS as [BrandFont, ...BrandFont[]]).optional(),
  hashtags: z.array(z.string()).max(10).optional(),
  outroText: z.string().max(80).optional(),
  subscribeText: z.string().max(40).optional(),
  imageStyle: z.string().max(500).optional(),
  defaultSkillId: z.string().nullable().optional(),
});
const Output = z.object({ changed: z.array(z.string()) });

export class UpdateChannel extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'update_channel';
  readonly title = 'Sửa thông tin kênh';
  readonly description = 'Sửa thông tin kênh (chỉ truyền các trường cần đổi): tên, mô tả, khán giả, giọng văn cho AI, giọng đọc, bảng màu (#RRGGBB, màu đầu là màu chính), font, hashtag, câu chào cuối, chữ nút đăng ký, phong cách ảnh AI (tiếng Anh), skill mặc định.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize(a: z.infer<typeof Input>) {
    return `Sửa kênh: ${Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined).join(', ') || '(không có gì)'}`;
  }

  protected async execute(patch: z.infer<typeof Input>, ctx: ToolContext) {
    const c = await channelService.get(ctx.channelId);
    if (patch.defaultSkillId) await skillService.get(c.id, patch.defaultSkillId);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await channelService.update(c.id, channelInput(c, defined));
    return { changed: Object.keys(defined) };
  }

  present({ changed }: z.infer<typeof Output>) {
    return `Đã sửa kênh: ${changed.join(', ')}.`;
  }
}
