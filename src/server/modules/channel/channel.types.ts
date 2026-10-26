import { z } from 'zod';

import { VOICES } from '@/core/domain';

const voiceIds = Object.keys(VOICES) as [keyof typeof VOICES, ...(keyof typeof VOICES)[]];

export const ChannelInput = z.object({
  name: z.string().trim().min(1, 'Cần tên kênh').max(60),
  audience: z.string().trim().min(1, 'Cần mô tả khán giả').max(300),
  style: z.string().trim().min(1, 'Cần mô tả giọng văn').max(500),
  voice: z.enum(voiceIds),
  outroText: z.string().trim().max(80),
  subscribeText: z.string().trim().max(40),
  hashtags: z.array(z.string().trim().regex(/^#\S+$/, 'Hashtag phải bắt đầu bằng #')).max(10),
  music: z.string().regex(/^(none|[\w-]+\.(wav|mp3))$/, 'Nhạc nền không hợp lệ'),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu dạng #RRGGBB')).min(1).max(6),
  defaultSkillId: z.string().nullable(),
});
export type ChannelInput = z.infer<typeof ChannelInput>;
