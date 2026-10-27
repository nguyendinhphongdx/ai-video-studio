import { z } from 'zod';

import { defineTask } from '../agent/task';

export interface RecentVideo {
  topic: string;
  title: string;
  status: string;
  series: string | null;
}

const IdeasSchema = z.object({
  ideas: z.array(z.object({ topic: z.string().describe('Chủ đề video, 1 câu (tối đa 120 ký tự), nói rõ góc hấp dẫn, viết như người dùng sẽ gõ vào ô ý tưởng'), why: z.string().describe('Vì sao nên làm tiếp chủ đề này (1 câu ngắn): nối với video nào, hay lấp khoảng trống nào của kênh') })),
});

/** Next-video ideas for a channel, from its identity, knowledge and what it has already made. */
export const suggestTopicsTask = defineTask<{ recent: RecentVideo[]; count: number }, { topic: string; why: string }[]>({
  id: 'suggest-topics',
  version: 1,
  layers: ['system', 'channel', 'knowledge', 'instructions'],
  schema: () => IdeasSchema,
  prompt: ({ recent, count }) => `${recent.length ? `Các video kênh đã có hoặc đang làm (mới nhất trước):\n${recent.map((r) => `- ${r.topic}${r.title && r.title !== r.topic ? ` (tên: ${r.title})` : ''}${r.series ? ` [series ${r.series}]` : ''} · ${r.status}`).join('\n')}` : 'Kênh chưa có video nào.'}

Hãy gợi ý ${count} chủ đề video TIẾP THEO cho kênh này. Yêu cầu:
- Bám đúng chủ đề, khán giả và tri thức của kênh; không trùng và không na ná các video đã có.
- Có mạch: ít nhất một chủ đề nối tiếp trực tiếp video gần nhất (đào sâu một chi tiết, trả lời câu hỏi còn bỏ ngỏ, phần 2), và một chủ đề lấp khoảng trống mà kênh chưa đụng tới.
- Đa dạng góc độ và độ khó, mỗi chủ đề đủ hấp dẫn để người ta bấm xem; chỉ chọn chủ đề mà bạn chắc về mặt thực tế.`,
  parse: (raw, { count }) =>
    IdeasSchema.parse(raw)
      .ideas.map((i) => ({ topic: i.topic.trim().slice(0, 160), why: i.why.trim() }))
      .filter((i) => i.topic)
      .slice(0, count),
});
