import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { OutroSceneProps } from '@video/blocks';

import type { Assert, Same } from './shared';

const props = z.object({});
export type _OutroMatchesComponent = Assert<Same<z.infer<typeof props>, OutroSceneProps>>;

export const outroBlock = defineBlock({
  id: 'outro',
  name: 'Kết của kênh',
  summary: 'Phần kết do chính kênh thiết kế: câu chào cuối, nút đăng ký, logo/avatar',
  aiGuide: 'Cảnh kết: dùng thiết kế phần kết riêng của kênh (câu chào cuối và nút đăng ký lấy từ cài đặt kênh). Dùng đúng 1 lần, ở cảnh cuối. Lời đọc nhắc khán giả đăng ký kênh.',
  props,
  fields: [],
  defaults: {},
  minSeconds: 4,
});
