import { defineTool } from '@/core/tools/tool';

import { cardsBlock } from './blocks/cards';
import { chartBlock } from './blocks/chart';
import { counterBlock } from './blocks/counter';
import { dotsBlock } from './blocks/dots';
import { gaugeBlock } from './blocks/gauge';
import { kineticBlock } from './blocks/kinetic';
import { timelineBlock } from './blocks/timeline';
import { outroBlock } from './blocks/outro';
import { pictureBlock } from './blocks/picture';
import { quizBlock } from './blocks/quiz';
import { recapBlock } from './blocks/recap';
import { titleBlock } from './blocks/title';
import { voxBlock } from './blocks/vox';
import { whiteboardBlock } from './blocks/whiteboard';

/**
 * Installed Remotion version. A constant because this file also loads on the server, where importing
 * `remotion` itself is not allowed; tests/tools/catalog.test.ts keeps it in sync with package.json.
 */
export const REMOTION_VERSION = '4.0.538';

export const remotionTool = defineTool({
  id: 'remotion',
  name: 'Remotion',
  summary: 'Hoạt hình React: thẻ màu, bảng trắng, ôn tập, câu đố, ảnh Vox có chuyển động, chữ chuyển động, con số lớn, biểu đồ cột, dòng thời gian, đồng hồ kim, chấm tỉ lệ, mở đầu, kết. Xem trước trực tiếp trong storyboard.',
  version: REMOTION_VERSION,
  requires: 'Chrome Headless Shell (Remotion tự tải lần đầu), ffmpeg',
  previewable: true,
  blocks: [titleBlock, cardsBlock, whiteboardBlock, recapBlock, quizBlock, pictureBlock, voxBlock, kineticBlock, counterBlock, chartBlock, timelineBlock, gaugeBlock, dotsBlock, outroBlock],
});
