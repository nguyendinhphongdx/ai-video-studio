import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { TitleSceneProps } from '@video/blocks';

import { Look, LOOK_OPTIONS, type Assert, type Same } from './shared';

const props = z.object({ title: z.string().describe('Tên video hiện trên màn hình, ngắn gọn'), look: Look });
export type _TitleMatchesComponent = Assert<Same<z.infer<typeof props>, TitleSceneProps>>;

export const titleBlock = defineBlock({
  id: 'title',
  name: 'Mở đầu',
  summary: 'Logo kênh và tên video bay vào',
  aiGuide: 'Cảnh mở đầu: hiện logo kênh và tên video. Dùng đúng 1 lần, ở cảnh đầu tiên. Lời đọc là 1 câu chào mở đầu.',
  props,
  fields: [
    { key: 'title', label: 'Tên video trên màn hình', kind: 'text', maxLength: 40 },
    { key: 'look', label: 'Kiểu nền', kind: 'choice', options: LOOK_OPTIONS },
  ],
  defaults: { title: 'Tên video', look: 'sky' },
  minSeconds: 3,
});
