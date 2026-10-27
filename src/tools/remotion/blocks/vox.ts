import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';

import { defineBlock } from '@/core/tools/tool';
import type { VoxSceneProps } from '@video/blocks';
import { autoMotion, labelStyleFor } from '@video/blocks/variants';

import { FX_OPTIONS, FxEnum, moveCue, DEPTH_OPTIONS, DepthEnum, MOTION_OPTIONS, MotionEnum, SHOT_OPTIONS, SHOT_TEXT, ShotEnum, type Assert, type Same, type Shot } from './shared';

/** Default look of a Vox image, used when the skill (or channel) declares no imageStyle of its own. */
export const VOX_IMAGE_STYLE =
  'Vox-style documentary paper collage with real physical depth, built in three layers. FOREGROUND: a few oversized torn paper scraps, a strip of translucent masking tape or a metal pushpin, slightly out of focus at the edges, casting long hard shadows. MIDGROUND: the main subject cut out of halftone-printed paper with a thin crimson-red outline and a visible white paper edge, raised above the board on a thick drop shadow, shown at a slight three-quarter angle. BACKGROUND: a dark charcoal graph-grid paper panel with thin white grid lines and faint diagrams, laid over an aged newspaper page with blurred unreadable print, edges curling. Single directional light from the upper left with crisp raised-paper shadows, subtle paper grain and ink-bleed, muted sepia, black and cream palette with one crimson accent and at most one canary-yellow highlight. Wide 16:9 frame, composition set by the shot direction, always leaving some empty paper area free for a caption sticker, absolutely no text, no letters, no watermark.';

const props = z.object({
  label: z.string().describe('Nhãn chữ in hoa dán trên màn hình, tối đa 28 ký tự: tên riêng, con số hoặc từ khoá của cảnh (VD "BOEING 777", "25 CM/NĂM"). Có thể để trống'),
  imagePrompt: z.string().describe('Tiếng Anh, 1-2 câu: chỉ mô tả CHỦ THỂ và bố cục của cảnh (VD "a Boeing 777 airliner, a radar sweep diagram on grid paper"). Không mô tả phong cách, không có chữ trong ảnh; hệ thống tự thêm phong cách Vox'),
  motion: MotionEnum,
  depth: DepthEnum,
  fx: FxEnum,
  shot: ShotEnum,
});
export type _VoxMatchesComponent = Assert<Same<z.infer<typeof props>, VoxSceneProps>>;

/** Sounds that go with a Vox scene: its camera move on the way in, and its caption sticker when it lands. */
export function voxCues({ props, ordinal }: { props: Record<string, unknown>; ordinal: number }): SfxCue[] {
  const move = !props.motion || props.motion === 'auto' ? autoMotion(ordinal) : String(props.motion);
  const cues: SfxCue[] = [...moveCue(move)];
  if (String(props.label ?? '').trim()) {
    const look = labelStyleFor(ordinal);
    if (look === 'stamp') cues.push({ kind: 'stamp', at: 0.55 });
    else if (look === 'tape') cues.push({ kind: 'paper', at: 0.45 });
    else if (look === 'marker') cues.push({ kind: 'whoosh-soft', at: 0.42, volume: 0.22 });
    else for (const at of [0.5, 0.64, 0.78]) cues.push({ kind: 'tick', at });
  }
  return cues;
}

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
    { key: 'fx', label: 'Hiệu ứng ánh sáng', kind: 'choice', options: FX_OPTIONS },
    { key: 'motion', label: 'Chuyển động', kind: 'choice', options: MOTION_OPTIONS },
    { key: 'depth', label: 'Chiều sâu', kind: 'choice', options: DEPTH_OPTIONS },
  ],
  defaults: { label: '', imagePrompt: 'a vintage airliner on grid paper', motion: 'auto', depth: 'auto', fx: 'auto', shot: 'auto' },
  varyBy: ['shot'],
  sfx: voxCues,
  minSeconds: 4,
  image: { promptKey: 'imagePrompt', style: VOX_IMAGE_STYLE, compose: (p) => SHOT_TEXT[p.shot as Shot] ?? '' },
  normalize: (p) => ({ ...p, label: p.label.trim().slice(0, 30), imagePrompt: p.imagePrompt.trim() }),
});
