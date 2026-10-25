import { defineTool } from '@/core/tool';

import { cardsTool } from '../cards/definition';

/** Same content as @cards, drawn as an editable HTML + GSAP page by HyperFrames. */
export const hyperframesCardsTool = defineTool({
  ...cardsTool,
  id: 'hyperframes-cards',
  name: 'Thẻ màu (HyperFrames)',
  summary: 'Như Thẻ màu, nhưng dựng bằng HTML/GSAP: sửa tay được sau khi render',
  aiGuide: `${cardsTool.aiGuide} Chỉ dùng khi skill yêu cầu bản HTML chỉnh tay được.`,
  engine: 'hyperframes',
  previewable: false,
});
