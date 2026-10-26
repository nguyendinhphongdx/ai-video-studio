import type { ContextLayer } from '../layer';

/** Visual/audio identity the AI must respect, plus how to use each allowed block. */
export const styleLayer: ContextLayer = {
  id: 'style',
  title: 'Phong cách và khối dựng được phép',
  order: 40,
  maxChars: 8000,
  render: ({ channel, blocks }) => `Màu thương hiệu: ${channel.palette.join(', ')} (chọn màu cảnh hài hoà với bảng màu này).
Logo, nhạc nền, giọng đọc, nút đăng ký do hệ thống tự thêm, không cần mô tả trong kịch bản.

${blocks.map((b) => `### @${b.ref}: ${b.name}\n${b.aiGuide}`).join('\n\n')}`,
};
