import { api } from '@/lib/api/client';
import type { ChannelView } from '@/server/modules/channel/channel.service';
import type { ChannelInput } from '@/server/modules/channel/channel.types';

export type { ChannelInput, ChannelView };

const upload = (path: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api<ChannelView>(path, { form });
};

export const channelApi = {
  get: (id: string) => api<ChannelView>(`/channels/${id}`),
  create: (input: ChannelInput) => api<ChannelView>('/channels', { body: input }),
  update: (id: string, input: ChannelInput) => api<ChannelView>(`/channels/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<{ ok: true }>(`/channels/${id}`, { method: 'DELETE' }),
  uploadLogo: (id: string, file: File) => upload(`/channels/${id}/logo`, file),
  uploadMusic: (id: string, file: File) => upload(`/channels/${id}/music`, file),
};

export const toInput = (c: ChannelView): ChannelInput => ({
  name: c.name,
  description: c.description,
  font: c.font,
  audience: c.audience,
  style: c.style,
  voice: c.voice,
  outroText: c.outroText,
  subscribeText: c.subscribeText,
  hashtags: c.hashtags,
  music: c.music,
  palette: c.palette,
  defaultSkillId: c.defaultSkillId,
});

export const NEW_CHANNEL: ChannelInput = {
  name: '',
  description: '',
  font: 'Baloo2',
  audience: 'khán giả Việt Nam',
  style: 'câu ngắn, dễ hiểu, giọng thân thiện',
  voice: 'vi-VN-HoaiMyNeural',
  outroText: 'Hẹn gặp lại nhé!',
  subscribeText: '🔔 ĐĂNG KÝ KÊNH',
  hashtags: [],
  music: 'music.wav',
  palette: ['#4F46E5', '#FFC53D', '#FF5C8A'],
  defaultSkillId: null,
};
