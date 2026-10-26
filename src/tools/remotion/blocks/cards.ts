import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { CardsSceneProps } from '@video/blocks';

import { Count, HexColor, clampCount, cleanColor, type Assert, type Same } from './shared';

const props = z.object({
  heading: z.string().describe('Chữ thật lớn trên màn hình: số, chữ cái hoặc 1-2 từ (tối đa 12 ký tự)'),
  emoji: z.string().describe('Đúng 1 emoji minh hoạ, dễ nhận ra'),
  count: Count,
  caption: z.string().describe('Câu ngắn dưới hình, tối đa 40 ký tự'),
  color: HexColor,
});
export type _CardsMatchesComponent = Assert<Same<z.infer<typeof props>, CardsSceneProps>>;

export const cardsBlock = defineBlock({
  id: 'cards',
  name: 'Thẻ màu',
  summary: 'Chữ lớn nảy + emoji nhún nhảy trên nền màu tươi',
  aiGuide:
    'Một ý đơn giản mỗi cảnh: chữ lớn (số, chữ cái, từ ngắn), emoji lặp lại "count" lần, chú thích ngắn. Hợp với đếm số, chữ cái, màu sắc, con vật, đồ vật.',
  props,
  fields: [
    { key: 'heading', label: 'Chữ lớn', kind: 'text', maxLength: 14 },
    { key: 'emoji', label: 'Emoji', kind: 'emoji' },
    { key: 'count', label: 'Số lượng', kind: 'count', min: 1, max: 10 },
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 48 },
    { key: 'color', label: 'Màu nền', kind: 'color' },
  ],
  defaults: { heading: 'Mới', emoji: '⭐', count: 1, caption: 'Chú thích', color: '#48DBFB' },
  minSeconds: 3.5,
  normalize: (p) => ({ ...p, count: clampCount(p.count), color: cleanColor(p.color) }),
});
