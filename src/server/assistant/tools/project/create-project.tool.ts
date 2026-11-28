import { z } from 'zod';

import { StudioTool } from '@/core/assistant/tool';
import { BRAND_FONT_IDS, VOICE_IDS, type BrandFont, type VoiceId } from '@/core/domain';
import { channelService } from '@/server/modules/channel/channel.service';
import { ChannelInput } from '@/server/modules/channel/channel.types';
import { skillService } from '@/server/modules/skill/skill.service';

const Input = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(500).default(''),
  audience: z.string().min(1).max(300).default('khán giả Việt Nam'),
  style: z.string().min(1).max(500).default('câu ngắn, dễ hiểu, giọng thân thiện'),
  voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]).default('vi-VN-HoaiMyNeural'),
  font: z.enum(BRAND_FONT_IDS as [BrandFont, ...BrandFont[]]).default('Baloo2'),
  palette: z.array(z.string()).min(1).max(6).default(['#6C4CE0', '#FFC83D', '#1E1B2E']),
  marketSkillId: z.string().optional(),
});
const Output = z.object({ projectId: z.string(), name: z.string(), skillId: z.string().nullable() });

export class CreateProject extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'create_project';
  readonly title = 'Tạo dự án';
  readonly description = 'Tạo một dự án (kênh) mới. Truyền marketSkillId (xem list_blocks, hoặc list_skills market=true của một dự án khác) để cài sẵn một skill làm mặc định; dự án chưa có skill thì chưa tạo được video. Sau đó dùng update_channel, save_knowledge, create_series hoặc create_episode.';
  readonly risk = 'write';
  override readonly scope = 'workspace';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize({ name }: z.infer<typeof Input>) {
    return `Tạo dự án “${name}”`;
  }

  protected async execute({ marketSkillId, ...a }: z.infer<typeof Input>) {
    const base = ChannelInput.parse({ ...a, introDesign: null, outroDesign: null, imageStyle: '', outroText: 'Hẹn gặp lại nhé!', subscribeText: '🔔 ĐĂNG KÝ KÊNH', hashtags: [], music: 'music.wav', defaultSkillId: null });
    const channel = await channelService.create(base);
    if (!marketSkillId) return { projectId: channel.id, name: channel.name, skillId: null };
    const { skill } = await skillService.install(channel.id, marketSkillId);
    await channelService.update(channel.id, { ...base, defaultSkillId: skill.id });
    return { projectId: channel.id, name: channel.name, skillId: skill.id };
  }

  present({ projectId, name, skillId }: z.infer<typeof Output>) {
    return `Đã tạo dự án "${name}" (projectId ${projectId}).${skillId ? ` Skill mặc định: ${skillId}.` : ' Chưa có skill: cài bằng install_market_skill rồi đặt defaultSkillId bằng update_channel.'}`;
  }
}
