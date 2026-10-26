import { z } from 'zod';

import { defineTask } from '../agent/task';
import type { EpisodeMemory } from '../domain/episode';

const SeasonSchema = z.object({ summary: z.string().describe('Tóm tắt cả mùa trong 4-6 câu: đã dạy gì, theo thứ tự nào, nhân vật và câu đùa lặp lại') });

/** Folds the memory of many episodes into one season summary so the context stays small. */
export const rollupSeasonTask = defineTask<{ previous: string | null; memories: EpisodeMemory[] }, string>({
  id: 'rollup-season',
  version: 1,
  layers: ['system', 'channel', 'instructions'],
  schema: () => SeasonSchema,
  prompt: ({ previous, memories }) => `${previous ? `Tóm tắt mùa hiện có:\n${previous}\n\n` : ''}Bộ nhớ từng tập (theo thứ tự):
${memories.map((m) => `- Tập ${m.number ?? '?'} "${m.title}": ${m.summary} | Kiến thức: ${m.concepts.join(', ')} | Ví dụ: ${m.examples.join(', ')}`).join('\n')}

Hãy gộp tất cả thành một bản tóm tắt mùa ngắn gọn để các tập sau biết đã dạy gì mà không lặp lại.`,
  parse: (raw) => SeasonSchema.parse(raw).summary.trim(),
});
