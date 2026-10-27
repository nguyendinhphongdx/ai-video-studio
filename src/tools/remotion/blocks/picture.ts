import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';

import { defineBlock } from '@/core/tools/tool';
import type { PictureSceneProps } from '@video/blocks';
import { autoMotion, captionLookFor, cutFor } from '@video/blocks/variants';

import { cutCue, FX_OPTIONS, FxEnum, moveCue, RHYTHM_OPTIONS, RhythmEnum, MOTION_OPTIONS, MotionEnum, SHOT_OPTIONS, SHOT_TEXT, ShotEnum, type Assert, type Same, type Shot, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  caption: z.string().describe('Chú thích ngắn hiện trên ảnh, tối đa 50 ký tự (tên, con số, ý chính của cảnh). Có thể để trống'),
  imagePrompt: z.string().describe('Tiếng Anh, 1-2 câu: tả chủ thể, bối cảnh và bố cục của cảnh (ví dụ "a street food vendor at night, steam rising, wide shot"). Không tả phong cách vẽ, không có chữ trong ảnh; phong cách ảnh do kênh quy định'),
  motion: MotionEnum,
  fx: FxEnum,
  rhythm: RhythmEnum,
  shot: ShotEnum,
  transition: TransitionEnum,
});
export type _PictureMatchesComponent = Assert<Same<z.infer<typeof props>, PictureSceneProps>>;

/** Sounds that go with a picture scene: its camera move, and the caption when it slides in. */
export function pictureCues({ props, ordinal }: { props: Record<string, unknown>; ordinal: number }): SfxCue[] {
  const move = !props.motion || props.motion === 'auto' ? autoMotion(ordinal) : String(props.motion);
  const rhythm = !props.rhythm || props.rhythm === 'auto' ? cutFor(ordinal) : String(props.rhythm);
  const cues: SfxCue[] = [...(rhythm !== 'none' ? cutCue(rhythm) : moveCue(move))];
  if (String(props.caption ?? '').trim()) {
    const look = captionLookFor(ordinal);
    if (look === 'chip') cues.push({ kind: 'pop', at: 0.45 });
    else if (look === 'ribbon') cues.push({ kind: 'whoosh-soft', at: 0.4, volume: 0.22 });
  }
  return cues;
}

export const pictureBlock = defineBlock({
  id: 'picture',
  name: 'Ảnh minh hoạ AI',
  summary: 'Một ảnh do AI tạo theo phong cách ảnh của kênh, có chuyển động máy quay và chú thích',
  aiGuide:
    'Một cảnh dùng ảnh AI toàn khung để minh hoạ đúng điều lời đọc đang nói. imagePrompt bằng tiếng Anh, tả chủ thể + bối cảnh + bố cục (cận cảnh, toàn cảnh, từ trên xuống...). ' +
    'Không tả phong cách vẽ và không có chữ trong ảnh: phong cách do kênh quy định. caption là chữ ngắn chốt ý của cảnh. Để motion là auto để hệ thống tự đổi chuyển động và kiểu chú thích giữa các cảnh. Mỗi cảnh một chủ thể. LUÔN chọn shot cụ thể và đổi liên tục để các cảnh không cùng một khung hình.',
  props,
  fields: [
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 60 },
    { key: 'imagePrompt', label: 'Mô tả ảnh (tiếng Anh)', kind: 'textarea', maxLength: 400, hint: 'Tả chủ thể, bối cảnh, bố cục. Phong cách ảnh lấy từ cài đặt của kênh.' },
    { key: 'shot', advanced: true, label: 'Kiểu khung hình', kind: 'choice', options: SHOT_OPTIONS, hint: 'Đổi kiểu khung giữa các cảnh để video không lặp bố cục.' },
    { key: 'fx', advanced: true, label: 'Hiệu ứng ánh sáng', kind: 'choice', options: FX_OPTIONS },
    { key: 'rhythm', advanced: true, label: 'Cắt nhịp', kind: 'choice', options: RHYTHM_OPTIONS },
    { key: 'motion', advanced: true, label: 'Chuyển động', kind: 'choice', options: MOTION_OPTIONS },
    { key: 'transition', advanced: true, label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { caption: '', imagePrompt: 'a calm city street at dusk, wide shot', motion: 'auto', fx: 'auto', rhythm: 'auto', shot: 'auto', transition: 'auto' },
  varyBy: ['shot'],
  minSeconds: 4,
  // Empty style: the channel's own image style is used (see the images pipeline step).
  image: { promptKey: 'imagePrompt', style: '', compose: (p) => SHOT_TEXT[p.shot as Shot] ?? '' },
  sfx: pictureCues,
  normalize: (p) => ({ ...p, caption: p.caption.trim().slice(0, 60), imagePrompt: p.imagePrompt.trim() }),
});
