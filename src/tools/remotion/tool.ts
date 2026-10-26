import { defineTool } from '@/core/tools/tool';

import { cardsBlock } from './blocks/cards';
import { outroBlock } from './blocks/outro';
import { titleBlock } from './blocks/title';
import { whiteboardBlock } from './blocks/whiteboard';

/**
 * Installed Remotion version. A constant because this file also loads on the server, where importing
 * `remotion` itself is not allowed; tests/tools/catalog.test.ts keeps it in sync with package.json.
 */
export const REMOTION_VERSION = '4.0.538';

export const remotionTool = defineTool({
  id: 'remotion',
  name: 'Remotion',
  summary: 'Hoạt hình React: thẻ màu, bảng trắng, mở đầu, kết. Xem trước trực tiếp trong storyboard.',
  version: REMOTION_VERSION,
  requires: 'Chrome Headless Shell (Remotion tự tải lần đầu), ffmpeg',
  previewable: true,
  blocks: [titleBlock, cardsBlock, whiteboardBlock, outroBlock],
});
