import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { TitleSceneProps } from '@video/blocks';

import type { Assert, Same } from './shared';

const props = z.object({ title: z.string().describe('Tên video hiện trong phần mở đầu của kênh, ngắn gọn (tối đa 40 ký tự)') });
export type _TitleMatchesComponent = Assert<Same<z.infer<typeof props>, TitleSceneProps>>;

export const titleBlock = defineBlock({
  id: 'title',
  name: 'Mở đầu của kênh',
  summary: 'Phần mở đầu do chính kênh thiết kế (AI thiết kế, sửa ở trang kênh); chèn tên video',
  aiGuide: 'Cảnh mở đầu: dùng thiết kế mở đầu riêng của kênh và chèn tên video. Dùng đúng 1 lần, ở cảnh đầu tiên. Lời đọc là 1 câu mở đầu hợp giọng kênh.',
  props,
  fields: [{ key: 'title', label: 'Tên video trên màn hình', kind: 'text', maxLength: 40 }],
  defaults: { title: 'Tên video' },
  minSeconds: 3,
});
