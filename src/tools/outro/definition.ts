import { z } from 'zod';

import { defineTool } from '@/core/tool';
import type { OutroSceneProps } from '@video/scenes';

import { Look, type Assert, type Same } from '../shared';

const props = z.object({ look: Look });
export type _OutroMatchesComponent = Assert<Same<z.infer<typeof props>, OutroSceneProps>>;

export const outroTool = defineTool({
  id: 'outro',
  name: 'Kết & đăng ký',
  summary: 'Logo, lời chào cuối và nút Đăng ký của kênh',
  aiGuide: 'Cảnh kết: logo, câu chào cuối và nút đăng ký lấy từ cài đặt kênh. Dùng đúng 1 lần, ở cảnh cuối. Lời đọc nhắc khán giả đăng ký kênh.',
  engine: 'remotion',
  props,
  fields: [],
  defaults: { look: 'sky' },
  minSeconds: 4,
  previewable: true,
});
