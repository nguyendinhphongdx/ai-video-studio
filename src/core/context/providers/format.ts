import type { ContextLayer } from '../layer';

export const formatLayer: ContextLayer = {
  id: 'format',
  title: 'Khung tập',
  order: 50,
  maxChars: 4000,
  render: ({ slots, format }) => {
    const lines = slots.map((s) => {
      if (s.fill === 'locked') return `- ${s.name}: do hệ thống điền sẵn (không viết phần này).`;
      const n = s.scenes.min === s.scenes.max ? `${s.scenes.min}` : `${s.scenes.min}-${s.scenes.max}`;
      return `- ${s.name} [slots.${s.id}]: ${n} cảnh, khối được dùng: ${s.blocks.map((b) => `@${b}`).join(', ')}.${s.guide ? ` ${s.guide}` : ''}`;
    });
    const duration = format.durationSec ? `\nTổng thời lượng khoảng ${format.durationSec.min}-${format.durationSec.max} giây.` : '';
    return `Video gồm các phần theo đúng thứ tự:\n${lines.join('\n')}${duration}`;
  },
};
