import type { ContextLayer } from '../layer';

/** What earlier episodes covered, so this one builds on them without repeating. */
export const memoryLayer: ContextLayer = {
  id: 'memory',
  title: 'Bộ nhớ: các tập trước',
  order: 60,
  maxChars: 6000,
  render: ({ series, memory }) => {
    if (!series || (!memory.season && !memory.recent.length)) return null;
    const used = (key: 'concepts' | 'examples' | 'jokes') => [...new Set(memory.recent.flatMap((m) => m[key]))];
    return [
      memory.season && `Tóm tắt các tập cũ: ${memory.season}`,
      ...memory.recent.map((m) => `- Tập ${m.number ?? '?'} "${m.title}": ${m.summary}`),
      used('examples').length && `Ví dụ đã dùng (không lặp lại): ${used('examples').join(', ')}`,
      used('concepts').length && `Kiến thức đã dạy: ${used('concepts').join(', ')}`,
      used('jokes').length && `Câu đùa đã dùng: ${used('jokes').join('; ')}`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
