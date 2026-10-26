import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { PictureSceneProps } from '@video/blocks';

import { MOTION_OPTIONS, MotionEnum, type Assert, type Same } from './shared';

const props = z.object({
  caption: z.string().describe('Chú thích ngắn hiện trên ảnh, tối đa 50 ký tự (tên, con số, ý chính của cảnh). Có thể để trống'),
  imagePrompt: z.string().describe('Tiếng Anh, 1-2 câu: tả chủ thể, bối cảnh và bố cục của cảnh (ví dụ "a street food vendor at night, steam rising, wide shot"). Không tả phong cách vẽ, không có chữ trong ảnh; phong cách ảnh do kênh quy định'),
  motion: MotionEnum,
});
export type _PictureMatchesComponent = Assert<Same<z.infer<typeof props>, PictureSceneProps>>;

export const pictureBlock = defineBlock({
  id: 'picture',
  name: 'Ảnh minh hoạ AI',
  summary: 'Một ảnh do AI tạo theo phong cách ảnh của kênh, có chuyển động máy quay và chú thích',
  aiGuide:
    'Một cảnh dùng ảnh AI toàn khung để minh hoạ đúng điều lời đọc đang nói. imagePrompt bằng tiếng Anh, tả chủ thể + bối cảnh + bố cục (cận cảnh, toàn cảnh, từ trên xuống...). ' +
    'Không tả phong cách vẽ và không có chữ trong ảnh: phong cách do kênh quy định. caption là chữ ngắn chốt ý của cảnh. Để motion là auto để hệ thống tự đổi chuyển động và kiểu chú thích giữa các cảnh. Mỗi cảnh một chủ thể, đừng lặp lại cùng một khung hình.',
  props,
  fields: [
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 60 },
    { key: 'imagePrompt', label: 'Mô tả ảnh (tiếng Anh)', kind: 'textarea', maxLength: 400, hint: 'Tả chủ thể, bối cảnh, bố cục. Phong cách ảnh lấy từ cài đặt của kênh.' },
    { key: 'motion', label: 'Chuyển động', kind: 'choice', options: MOTION_OPTIONS },
  ],
  defaults: { caption: '', imagePrompt: 'a calm city street at dusk, wide shot', motion: 'auto' },
  minSeconds: 4,
  // Empty style: the channel's own image style is used (see the images pipeline step).
  image: { promptKey: 'imagePrompt', style: '' },
  normalize: (p) => ({ ...p, caption: p.caption.trim().slice(0, 60), imagePrompt: p.imagePrompt.trim() }),
});
