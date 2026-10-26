import { defineBlock } from '@/core/tools/tool';

import { cardsBlock } from '../../remotion/blocks/cards';

/** Same content as @remotion/cards, drawn as an editable HTML + GSAP page. */
export const hyperframesCardsBlock = defineBlock({
  ...cardsBlock,
  summary: 'Như thẻ màu, nhưng dựng bằng HTML/GSAP: sửa tay được sau khi render',
  aiGuide: `${cardsBlock.aiGuide} Chỉ dùng khi skill yêu cầu bản HTML chỉnh tay được.`,
});
