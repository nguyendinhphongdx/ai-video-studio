import type { ContextLayer } from '../layer';

/** The series bible: what stays the same in every episode. Absent for one-off videos. */
export const instructionsLayer: ContextLayer = {
  id: 'instructions',
  title: 'Instructions của series',
  order: 20,
  maxChars: 6000,
  render: ({ series }) => {
    if (!series) return null;
    const b = series.version.bible;
    return [
      `Series: ${series.series.name}`,
      b.premise && `Ý tưởng chương trình: ${b.premise}`,
      b.host && `Nhân vật dẫn: ${b.host}`,
      b.catchphrases.length && `Câu bắt buộc phải có trong mỗi tập: ${b.catchphrases.map((c) => `"${c}"`).join('; ')}`,
      b.avoid.length && `Tuyệt đối tránh: ${b.avoid.join('; ')}`,
      b.instructions,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
