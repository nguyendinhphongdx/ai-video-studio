import { z } from 'zod';

import { defineTask } from '../agent/task';
import { fold } from '../text';
import { storyLines, type RecentVideo } from './suggest-topics';

export const PROBLEM_KINDS = ['duplicate', 'gap', 'off-story', 'other'] as const;

const AnalysisSchema = z.object({
  title: z.string().describe('Tên tập, ngắn gọn, hấp dẫn (tối đa 80 ký tự)'),
  synopsis: z.string().describe('Tóm tắt tập này kể gì, đúng 2 câu'),
  goal: z.string().describe('Người xem nhận được gì sau tập này (1 câu)'),
  position: z.string().describe('Tập này nằm ở đâu trong phim: nối tiếp tập nào, mở ra câu hỏi gì, trả lời câu hỏi nào còn bỏ ngỏ (1-2 câu)'),
  after: z.number().int().nullable().describe('Số thứ tự tập mà tập này nối tiếp trực tiếp (số có trong danh sách); null nếu là tập mở đầu hoặc không nối tiếp tập nào'),
  problems: z
    .array(z.object({ kind: z.enum(PROBLEM_KINDS), text: z.string().describe('Vấn đề cụ thể, nêu số tập liên quan') }))
    .describe('Chỉ vấn đề thật: trùng hoặc na ná một tập đã có, nhảy cóc làm mất mạch, lệch cốt truyện. Để trống nếu ổn.'),
});

export type TopicProblem = z.infer<typeof AnalysisSchema>['problems'][number];
export interface TopicAnalysis {
  title: string;
  synopsis: string;
  goal: string;
  position: string;
  after: number | null;
  problems: TopicProblem[];
}

export interface AnalyzeInput {
  topic: string;
  existing: RecentVideo[];
  story?: string;
  /** Second round: the first answer and what a machine found wrong with it. */
  fix?: { draft: TopicAnalysis; problems: string[] };
}

/** Folded words of a topic, short filler dropped. */
const words = (text: string) => new Set(fold(text).split(/[^a-z0-9]+/).filter((w) => w.length > 2));

/** Number of an existing episode that says nearly the same thing as `topic`, or null. Deterministic: no AI. */
export function duplicateOf(topic: string, existing: RecentVideo[]): { number: number | null; topic: string } | null {
  const mine = words(topic);
  if (mine.size < 2) return null;
  for (const e of existing) {
    const theirs = words(`${e.topic} ${e.title}`);
    const shared = [...mine].filter((w) => theirs.has(w)).length;
    // Most of the shorter side is shared: the same story told again.
    if (shared / Math.min(mine.size, theirs.size) >= 0.8) return { number: e.number ?? null, topic: e.topic };
  }
  return null;
}

/** What is wrong with an answer that the model can fix on a second try. Empty means it is fine. */
export function analysisProblems(a: TopicAnalysis, existing: RecentVideo[]): string[] {
  const out: string[] = [];
  if (!a.title.trim() || a.title.trim().length > 80) out.push('Tên tập phải có và tối đa 80 ký tự.');
  if (!a.synopsis.trim()) out.push('Thiếu tóm tắt.');
  else if (a.synopsis.trim().split(/(?<=[.!?…])\s+/).filter(Boolean).length > 3) out.push('Tóm tắt phải đúng 2 câu.');
  if (!a.position.trim()) out.push('Thiếu vị trí của tập trong phim.');
  const numbers = new Set(existing.map((e) => e.number).filter((n): n is number => n != null));
  if (a.after != null && !numbers.has(a.after)) out.push(`"after" là ${a.after} nhưng phim không có tập số ${a.after}. Dùng một số có trong danh sách hoặc null.`);
  return out;
}

/** Looks at a topic the person typed before an episode is made: a title, what it tells, and where it sits in the story. */
export const analyzeTopicTask = defineTask<AnalyzeInput, TopicAnalysis>({
  id: 'analyze-topic',
  version: 1,
  layers: ['system', 'channel', 'knowledge', 'instructions'],
  schema: () => AnalysisSchema,
  prompt: ({ topic, existing, story, fix }) => `${story ? `Cốt truyện của phim:\n${story}\n\n` : ''}${existing.length ? `Các tập đã có hoặc đang làm, theo thứ tự trong phim:\n${storyLines(existing)}` : 'Phim chưa có tập nào.'}

Người làm phim muốn thêm một tập mới với ý tưởng: "${topic}"

Hãy phân tích ý tưởng này để họ quyết định có tạo tập không: đặt tên tập, tóm tắt 2 câu, mục tiêu cho người xem, và nói rõ tập này nằm ở đâu trong phim (nối tiếp tập nào, mở ra hoặc trả lời câu hỏi nào). Nêu vấn đề thật nếu có: trùng hoặc na ná một tập đã có, nhảy cóc làm mất mạch, lệch cốt truyện hay tri thức của kênh. Không bịa chi tiết ngoài cốt truyện và tri thức; không viết kịch bản.${
    fix ? `\n\nLần trước bạn trả lời:\n${JSON.stringify(fix.draft)}\nNhững chỗ chưa đạt:\n${fix.problems.map((p) => `- ${p}`).join('\n')}\nHãy sửa đúng những chỗ đó.` : ''
  }`,
  parse: (raw) => {
    const a = AnalysisSchema.parse(raw);
    return { ...a, title: a.title.trim(), synopsis: a.synopsis.trim(), goal: a.goal.trim(), position: a.position.trim(), problems: a.problems.map((p) => ({ ...p, text: p.text.trim() })).filter((p) => p.text).slice(0, 5) };
  },
});
