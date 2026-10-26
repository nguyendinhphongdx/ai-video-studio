import { defineTool } from '@/core/tools/tool';

import { hyperframesCardsBlock } from './blocks/cards';

/** Pinned CLI version, used by the renderer through npx. */
export const HYPERFRAMES_VERSION = '0.8.192';

export const hyperframesTool = defineTool({
  id: 'hyperframes',
  name: 'HyperFrames',
  summary: 'HTML + GSAP: dựng xong vẫn mở ra sửa tay được. Chưa xem trước trực tiếp.',
  version: HYPERFRAMES_VERSION,
  requires: 'Node + npx (tải CLI lần đầu, cần mạng), ffmpeg',
  previewable: false,
  blocks: [hyperframesCardsBlock],
});
