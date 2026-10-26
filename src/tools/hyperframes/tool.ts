import { defineTool } from '@/core/tools/tool';

import { hyperframesCardsBlock } from './blocks/cards';

export const hyperframesTool = defineTool({
  id: 'hyperframes',
  name: 'HyperFrames',
  summary: 'HTML + GSAP: dựng xong vẫn mở ra sửa tay được. Chưa xem trước trực tiếp.',
  previewable: false,
  blocks: [hyperframesCardsBlock],
});
