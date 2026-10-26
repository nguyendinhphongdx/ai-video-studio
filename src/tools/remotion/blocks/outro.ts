import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { OutroSceneProps } from '@video/blocks';

import { Look, LOOK_OPTIONS, type Assert, type Same } from './shared';

const props = z.object({ look: Look });
export type _OutroMatchesComponent = Assert<Same<z.infer<typeof props>, OutroSceneProps>>;

export const outroBlock = defineBlock({
  id: 'outro',
  name: 'Kết & đăng ký',
  summary: 'Logo, lời chào cuối và nút Đăng ký của kênh',
  aiGuide: 'Cảnh kết: logo, câu chào cuối và nút đăng ký lấy từ cài đặt kênh. Dùng đúng 1 lần, ở cảnh cuối. Lời đọc nhắc khán giả đăng ký kênh.',
  props,
  fields: [{ key: 'look', label: 'Kiểu nền', kind: 'choice', options: LOOK_OPTIONS }],
  defaults: { look: 'sky' },
  minSeconds: 4,
});
