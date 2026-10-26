import { defineTool } from '@/core/tools/tool';

import { cardsBlock } from './blocks/cards';
import { outroBlock } from './blocks/outro';
import { titleBlock } from './blocks/title';
import { whiteboardBlock } from './blocks/whiteboard';

export const remotionTool = defineTool({
  id: 'remotion',
  name: 'Remotion',
  summary: 'Hoạt hình React: thẻ màu, bảng trắng, mở đầu, kết. Xem trước trực tiếp trong storyboard.',
  previewable: true,
  blocks: [titleBlock, cardsBlock, whiteboardBlock, outroBlock],
});
