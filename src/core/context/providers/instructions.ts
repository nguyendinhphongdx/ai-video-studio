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
    // Only poses that have a picture can be used in a scene.
    const poses = Object.entries(b.customPoses ?? {}).filter(([id]) => b.characterSprites?.[`pose:${id}`]);
    const cast = Object.keys(b.characterCast ?? {}).filter((k) => !k.includes(':'));
    return [
      `Series: ${series.series.name}`,
      b.premise && `Ý tưởng chương trình: ${b.premise}`,
      b.host && `Nhân vật dẫn: ${b.host}`,
      b.catchphrases.length && `Câu bắt buộc phải có trong mỗi tập: ${b.catchphrases.map((c) => `"${c}"`).join('; ')}`,
      b.avoid.length && `Tuyệt đối tránh: ${b.avoid.join('; ')}`,
      b.instructions,
      // Ids the puppet scenes can use: supporting cast (companion/item) and the hero's own poses (pose).
      cast.length > 0 && `Dàn nhân vật phụ và bảo vật (id cho companion, item): ${cast.join(', ')}`,
      poses.length > 0 && `Tư thế riêng của nhân vật chính (id cho pose):\n${poses.map(([id, d]) => `- ${id}: ${d}`).join('\n')}`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
