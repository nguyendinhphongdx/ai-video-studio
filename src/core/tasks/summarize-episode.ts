import { z } from 'zod';

import { defineTask } from '../agent/task';
import type { Scene } from '../domain/episode';

const MemorySchema = z.object({
  summary: z.string().describe('1-2 câu: tập này dạy gì, diễn ra thế nào'),
  concepts: z.array(z.string()).describe('Kiến thức/khái niệm đã dạy'),
  examples: z.array(z.string()).describe('Ví dụ, đồ vật, con vật đã dùng'),
  vocabulary: z.array(z.string()).describe('Từ mới đã giới thiệu'),
  jokes: z.array(z.string()).describe('Câu đùa, tình huống vui đã dùng'),
});
export type MemoryNote = z.infer<typeof MemorySchema>;

/** Writes the series memory entry for an approved episode. Needs only the channel/series layers. */
export const summarizeEpisodeTask = defineTask<{ title: string; scenes: Scene[] }, MemoryNote>({
  id: 'summarize-episode',
  version: 1,
  layers: ['system', 'channel', 'instructions', 'episode'],
  schema: () => MemorySchema,
  prompt: ({ title, scenes }) => `Đây là kịch bản tập "${title}" vừa được duyệt:
${scenes.map((s, i) => `${i + 1}. [${s.block}] ${s.narration} ${JSON.stringify(s.props)}`).join('\n')}

Hãy ghi lại bộ nhớ cho series theo đúng schema, ngắn gọn, để các tập sau không lặp lại và có thể nhắc lại tập này.`,
  parse: (raw) => MemorySchema.parse(raw),
});
