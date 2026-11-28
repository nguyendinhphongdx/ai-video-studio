import { z } from 'zod';

import { defineTask } from '../agent/task';

export interface RecentVideo {
  topic: string;
  title: string;
  status: string;
  series: string | null;
  /** Position in the series; the model reads the list in this order. */
  number?: number | null;
  goal?: string;
}

/** What each status means to the model (it must not treat a plan as something already told). */
export const STATUS_FOR_AI: Record<string, string> = {
  planned: 'mới lên kế hoạch, chưa viết kịch bản',
  draft: 'nháp',
  script_review: 'đã có kịch bản, chờ duyệt',
  producing: 'đang dựng',
  video_review: 'đã dựng, chờ duyệt video',
  published: 'đã xuất bản',
};

/** One line per video, in story order (numbered first, then the rest). Shared by the topic tasks so they read the same list. */
export function storyLines(recent: RecentVideo[]): string {
  const ordered = [...recent].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  return ordered
    .map((r) => `- ${r.number != null ? `Tập ${r.number}: ` : ''}${r.topic}${r.title && r.title !== r.topic ? ` (tên: ${r.title})` : ''}${r.goal ? ` — mục tiêu: ${r.goal}` : ''}${r.series ? ` [series ${r.series}]` : ''} · ${STATUS_FOR_AI[r.status] ?? r.status}`)
    .join('\n');
}

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      topic: z.string().describe('Chủ đề video, 1 câu (tối đa 120 ký tự), nói rõ góc hấp dẫn, viết như người dùng sẽ gõ vào ô ý tưởng'),
      why: z.string().describe('Vì sao nên làm tiếp chủ đề này (1 câu ngắn): nối với tập nào, trả lời câu hỏi nào còn bỏ ngỏ, hay lấp khoảng trống nào của phim'),
      after: z.number().int().nullable().describe('Số thứ tự tập mà chủ đề này nối tiếp trực tiếp (số có trong danh sách); null nếu không nối tiếp tập nào'),
    }),
  ),
});

export interface TopicIdea {
  topic: string;
  why: string;
  /** Number of the episode this one follows from, when the model named one that exists. */
  after?: number;
}

/** Next-video ideas for a channel, from its identity, knowledge, story and what it has already made. */
export const suggestTopicsTask = defineTask<{ recent: RecentVideo[]; count: number; story?: string }, TopicIdea[]>({
  id: 'suggest-topics',
  version: 2,
  layers: ['system', 'channel', 'knowledge', 'instructions'],
  schema: () => IdeasSchema,
  prompt: ({ recent, count, story }) => `${story ? `Cốt truyện của phim:\n${story}\n\n` : ''}${recent.length ? `Các tập đã có hoặc đang làm, theo thứ tự trong phim:\n${storyLines(recent)}` : 'Phim chưa có tập nào.'}

Hãy gợi ý ${count} chủ đề cho tập TIẾP THEO để phim liền mạch. Yêu cầu:
- Bám đúng cốt truyện, chủ đề, khán giả và tri thức của kênh; không trùng và không na ná các tập đã có.
- Có mạch: phần lớn gợi ý phải kể tiếp trực tiếp từ tập gần nhất đã có kịch bản hoặc đã xuất bản (đào sâu một chi tiết, trả lời câu hỏi còn bỏ ngỏ, hậu quả của sự kiện cuối); điền "after" bằng số tập nó nối tiếp. Một gợi ý có thể mở hướng mới nhưng phải nói rõ vì sao trong "why".
- Các tập "mới lên kế hoạch" là dàn ý chưa kể: đừng coi là đã xảy ra. Nếu một gợi ý chính là một tập đã lên kế hoạch thì nói thẳng điều đó trong "why".
- ${recent.length ? 'Đa dạng góc độ và độ khó' : 'Gợi ý một tập MỞ ĐẦU hợp với cốt truyện (after = null)'}, mỗi chủ đề đủ hấp dẫn để người ta bấm xem; chỉ chọn chủ đề mà bạn chắc về mặt thực tế.`,
  parse: (raw, { count, recent }) => {
    const numbers = new Set(recent.map((r) => r.number).filter((n): n is number => n != null));
    return IdeasSchema.parse(raw)
      .ideas.map((i) => ({ topic: i.topic.trim().slice(0, 160), why: i.why.trim(), ...(i.after != null && numbers.has(i.after) ? { after: i.after } : {}) }))
      .filter((i) => i.topic)
      .slice(0, count);
  },
});
