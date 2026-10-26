import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { VoxSceneProps } from '@video/blocks';

import { MOTION_OPTIONS, MotionEnum, type Assert, type Same } from './shared';

const SHOTS = ['auto', 'wide', 'close-up', 'macro', 'top-down', 'low-angle', 'diagonal', 'left-third', 'right-third', 'split', 'scale-contrast', 'frame-in-frame', 'cluster'] as const;
type Shot = (typeof SHOTS)[number];

const SHOT_TEXT: Record<Shot, string> = {
  auto: '',
  wide: 'Wide establishing shot: the subject is small inside a large environment with lots of surrounding space',
  'close-up': 'Close-up: the subject fills about two thirds of the frame',
  macro: 'Extreme macro: one detail enlarged huge and cropped by the frame edges',
  'top-down': 'Top-down flat-lay view looking straight down at the paper pieces on the table',
  'low-angle': 'Low camera angle looking up so the subject towers over the viewer',
  diagonal: 'Dynamic diagonal composition: the subject and its arrow run along a tilted diagonal axis',
  'left-third': 'Subject placed in the left third of the frame, large empty space on the right',
  'right-third': 'Subject placed in the right third of the frame, large empty space on the left',
  split: 'Split composition: the frame divided into two contrasting halves by a torn paper edge',
  'scale-contrast': 'Dramatic scale contrast: one enormous object next to one tiny object',
  'frame-in-frame': 'The picture sits inside a frame within the frame (a polaroid, a window, a torn cover)',
  cluster: 'A cluster of three to five related paper pieces arranged asymmetrically',
};

const SHOT_OPTIONS: { value: Shot; label: string }[] = [
  { value: 'auto', label: 'Không chỉ định' },
  { value: 'wide', label: 'Toàn cảnh' },
  { value: 'close-up', label: 'Cận cảnh' },
  { value: 'macro', label: 'Cực cận một chi tiết' },
  { value: 'top-down', label: 'Nhìn từ trên xuống' },
  { value: 'low-angle', label: 'Góc thấp, vật sừng sững' },
  { value: 'diagonal', label: 'Bố cục chéo' },
  { value: 'left-third', label: 'Lệch trái' },
  { value: 'right-third', label: 'Lệch phải' },
  { value: 'split', label: 'Chia đôi đối lập' },
  { value: 'scale-contrast', label: 'Tương phản kích cỡ' },
  { value: 'frame-in-frame', label: 'Khung trong khung' },
  { value: 'cluster', label: 'Chùm nhiều mảnh' },
];

/** Default look of a Vox image, used when the skill (or channel) declares no imageStyle of its own. */
export const VOX_IMAGE_STYLE =
  'Vox-style documentary paper collage with real physical depth, built in three layers. FOREGROUND: a few oversized torn paper scraps, a strip of translucent masking tape or a metal pushpin, slightly out of focus at the edges, casting long hard shadows. MIDGROUND: the main subject cut out of halftone-printed paper with a thin crimson-red outline and a visible white paper edge, raised above the board on a thick drop shadow, shown at a slight three-quarter angle. BACKGROUND: a dark charcoal graph-grid paper panel with thin white grid lines and faint diagrams, laid over an aged newspaper page with blurred unreadable print, edges curling. Single directional light from the upper left with crisp raised-paper shadows, subtle paper grain and ink-bleed, muted sepia, black and cream palette with one crimson accent and at most one canary-yellow highlight. Wide 16:9 frame, composition set by the shot direction, always leaving some empty paper area free for a caption sticker, absolutely no text, no letters, no watermark.';

const props = z.object({
  label: z.string().describe('Nhãn chữ in hoa dán trên màn hình, tối đa 28 ký tự: tên riêng, con số hoặc từ khoá của cảnh (VD "BOEING 777", "25 CM/NĂM"). Có thể để trống'),
  imagePrompt: z.string().describe('Tiếng Anh, 1-2 câu: chỉ mô tả CHỦ THỂ và bố cục của cảnh (VD "a Boeing 777 airliner, a radar sweep diagram on grid paper"). Không mô tả phong cách, không có chữ trong ảnh; hệ thống tự thêm phong cách Vox'),
  motion: MotionEnum,
  shot: z
    .enum(SHOTS)
    .default('auto')
    .describe('Kiểu khung hình/bố cục của ảnh. LUÔN chọn một kiểu cụ thể (không để auto) và đổi liên tục: không hai cảnh liền nhau cùng shot, một shot không quá 2 lần trong cả video; xen toàn cảnh, cận cảnh, cực cận, nhìn từ trên, góc thấp, lệch trái/phải, chéo, chia đôi'),
});
export type _VoxMatchesComponent = Assert<Same<z.infer<typeof props>, VoxSceneProps>>;

export const voxBlock = defineBlock({
  id: 'vox',
  name: 'Cảnh Vox',
  summary: 'Ảnh cắt dán do AI tạo (phong cách Vox) + zoom/pan, sọc CRT, nhãn chữ dán',
  aiGuide:
    'Một cảnh giải thích kiểu Vox: AI tạo ảnh từ imagePrompt, hệ thống thêm chuyển động và nhãn. Mỗi cảnh một ý, một chủ thể rõ ràng. LUÔN chọn shot cụ thể và đổi liên tục để các cảnh không cùng một bố cục. ' +
    'imagePrompt bằng tiếng Anh, chỉ nói chủ thể và bố cục (không nói phong cách, không chữ trong ảnh). label là chữ dán ngắn khớp với điều lời đọc đang nhắc (tên, con số). Để motion là auto: hệ thống tự đổi chuyển động, kiểu nhãn và góc đặt nhãn giữa các cảnh.',
  props,
  fields: [
    { key: 'label', label: 'Nhãn chữ dán', kind: 'text', maxLength: 30 },
    { key: 'imagePrompt', label: 'Mô tả ảnh (tiếng Anh)', kind: 'textarea', maxLength: 400, hint: 'Chỉ tả chủ thể và bố cục. Phong cách Vox được thêm tự động.' },
    { key: 'shot', label: 'Kiểu khung hình', kind: 'choice', options: SHOT_OPTIONS, hint: 'Đổi kiểu khung giữa các cảnh để video không lặp bố cục.' },
    { key: 'motion', label: 'Chuyển động', kind: 'choice', options: MOTION_OPTIONS },
  ],
  defaults: { label: '', imagePrompt: 'a vintage airliner on grid paper', motion: 'auto', shot: 'auto' },
  varyBy: ['shot'],
  minSeconds: 4,
  image: { promptKey: 'imagePrompt', style: VOX_IMAGE_STYLE, compose: (p) => SHOT_TEXT[p.shot as Shot] ?? '' },
  normalize: (p) => ({ ...p, label: p.label.trim().slice(0, 30), imagePrompt: p.imagePrompt.trim() }),
});
