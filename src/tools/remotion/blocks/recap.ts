import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { RecapSceneProps } from '@video/blocks';

import { HexColor, cleanColor, type Assert, type Same } from './shared';

const props = z.object({
  heading: z.string().describe('Câu mở ôn tập, tối đa 20 ký tự, ví dụ "Hôm qua mình học"'),
  emojis: z.string().describe('1-5 emoji, mỗi emoji đại diện một điều đã học ở tập trước (viết liền, không dấu cách)'),
  caption: z.string().describe('Nhắc lại điều đã học, tối đa 40 ký tự'),
  color: HexColor,
});
export type _RecapMatchesComponent = Assert<Same<z.infer<typeof props>, RecapSceneProps>>;

export const recapBlock = defineBlock({
  id: 'recap',
  name: 'Ôn tập',
  summary: 'Nhắc lại bài trước: hàng emoji được tích xanh lần lượt',
  aiGuide: 'Cảnh ôn tập đầu tập (từ tập 2): nhắc lại điều đã học ở tập trước dựa vào "Bộ nhớ". Emoji lấy từ ví dụ tập trước; lời đọc 1-2 câu có nối tiếp ("Hôm qua chúng mình đã học...").',
  props,
  fields: [
    { key: 'heading', label: 'Câu mở', kind: 'text', maxLength: 24 },
    { key: 'emojis', label: 'Emoji đã học (1-5)', kind: 'text', maxLength: 20 },
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 48 },
    { key: 'color', label: 'Màu nền', kind: 'color' },
  ],
  defaults: { heading: 'Hôm qua mình học', emojis: '⭐🐥', caption: 'Nhắc lại bài cũ', color: '#7C4DFF' },
  minSeconds: 4.5,
  normalize: (p) => ({ ...p, color: cleanColor(p.color, '#7C4DFF') }),
});
