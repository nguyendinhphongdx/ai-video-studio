import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { WhiteboardSceneProps } from '@video/blocks';

import { Count, HexColor, clampCount, cleanColor, type Assert, type Same } from './shared';

const props = z.object({
  heading: z.string().describe('Tên bước, 1-3 từ, viết tay trên bảng'),
  emoji: z.string().describe('Đúng 1 emoji minh hoạ cho bước này'),
  count: Count,
  caption: z.string().describe('Giải thích ngắn viết tay, tối đa 40 ký tự'),
  color: HexColor,
});
export type _WhiteboardMatchesComponent = Assert<Same<z.infer<typeof props>, WhiteboardSceneProps>>;

export const whiteboardBlock = defineBlock({
  id: 'whiteboard',
  name: 'Bảng trắng',
  summary: 'Bút vẽ tay: tiêu đề có số thứ tự, hình hiện dần, chú thích viết tay',
  aiGuide: 'Một bước của quy trình hoặc lời giải thích, vẽ tay trên bảng trắng, tự đánh số. Hợp với vòng đời, các bước, nguyên nhân - kết quả.',
  props,
  fields: [
    { key: 'heading', label: 'Tên bước', kind: 'text', maxLength: 20 },
    { key: 'emoji', label: 'Emoji', kind: 'emoji' },
    { key: 'count', label: 'Số lượng', kind: 'count', min: 1, max: 10 },
    { key: 'caption', label: 'Chú thích viết tay', kind: 'text', maxLength: 48 },
    { key: 'color', label: 'Màu nhấn', kind: 'color' },
  ],
  defaults: { heading: 'Bước mới', emoji: '✏️', count: 1, caption: 'Giải thích ngắn', color: '#1E88E5' },
  minSeconds: 4.5,
  normalize: (p) => ({ ...p, count: clampCount(p.count), color: cleanColor(p.color, '#1E88E5') }),
});
