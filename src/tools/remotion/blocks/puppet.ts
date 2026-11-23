import { z } from 'zod';

import { defineBlock } from '@/core/tools/tool';
import type { PuppetSceneProps } from '@video/blocks';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const EmotionEnum = z.enum(['neutral', 'happy', 'angry', 'sad', 'surprised']).describe('Biểu cảm của nhân vật trong cảnh: neutral bình thường, happy vui, angry giận, sad buồn, surprised ngạc nhiên');
const ActionEnum = z
  .enum(['idle', 'enter', 'exit', 'walk', 'jump', 'wave'])
  .describe('Hành động: idle đứng thở và nói, enter đi từ ngoài vào rồi đứng nói, exit đứng nói rồi đi ra khỏi khung, walk đi ngang qua khung, jump nhảy lên vui mừng, wave vẫy tay chào');
const SideEnum = z.enum(['left', 'center', 'right']).describe('Vị trí nhân vật đứng trong khung (và phía nhân vật đi vào/ra). Xen kẽ trái và phải giữa các cảnh có hội thoại');

const props = z.object({
  caption: z.string().describe('Chữ ngắn dưới chân nhân vật, tối đa 50 ký tự, có thể để trống'),
  imagePrompt: z.string().describe('Tiếng Anh, 1-2 câu: chỉ tả PHÔNG NỀN của cảnh (địa điểm, đồ vật, thời gian trong ngày). KHÔNG có người hay nhân vật nào trong ảnh, chừa khoảng trống ở giữa-dưới khung cho nhân vật đứng'),
  emotion: EmotionEnum,
  action: ActionEnum,
  side: SideEnum,
  transition: TransitionEnum,
});
export type _PuppetMatchesComponent = Assert<Same<z.infer<typeof props>, PuppetSceneProps>>;

export const puppetBlock = defineBlock({
  id: 'puppet',
  name: 'Nhân vật diễn',
  summary: 'Nhân vật của series đi vào, nói (mở miệng, nháy mắt), đổi biểu cảm và đi ra trên một phông nền AI',
  aiGuide:
    'Cảnh có nhân vật của series đứng trên phông nền AI. imagePrompt chỉ tả phông nền, TUYỆT ĐỐI không có người hay nhân vật trong ảnh và chừa chỗ giữa-dưới cho nhân vật. ' +
    'Chọn emotion khớp với câu đang nói (vui, giận, ngạc nhiên...) và action theo diễn biến: cảnh đầu dùng enter, cảnh cuối dùng exit, nhân vật chạy qua dùng walk, mừng thì jump, chào thì wave, còn lại idle. ' +
    'Đổi side giữa các cảnh liền nhau và đổi emotion theo cảm xúc của câu, đừng để mọi cảnh cùng một biểu cảm.',
  props,
  fields: [
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 60 },
    { key: 'imagePrompt', label: 'Mô tả phông nền (tiếng Anh, không có người)', kind: 'textarea', maxLength: 400, hint: 'Chỉ tả nơi chốn và đồ vật. Nhân vật được ghép lên sau từ ảnh trong Bảng nhân vật.' },
    { key: 'emotion', label: 'Biểu cảm', kind: 'choice', options: [{ value: 'neutral', label: 'Bình thường' }, { value: 'happy', label: 'Vui' }, { value: 'angry', label: 'Giận' }, { value: 'sad', label: 'Buồn' }, { value: 'surprised', label: 'Ngạc nhiên' }] },
    { key: 'action', label: 'Hành động', kind: 'choice', options: [{ value: 'idle', label: 'Đứng nói' }, { value: 'enter', label: 'Đi vào rồi nói' }, { value: 'exit', label: 'Nói rồi đi ra' }, { value: 'walk', label: 'Đi ngang qua' }, { value: 'jump', label: 'Nhảy mừng' }, { value: 'wave', label: 'Vẫy tay' }] },
    { key: 'side', label: 'Vị trí', kind: 'choice', options: [{ value: 'left', label: 'Bên trái' }, { value: 'center', label: 'Giữa' }, { value: 'right', label: 'Bên phải' }] },
    { key: 'transition', advanced: true, label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { caption: '', imagePrompt: 'an ancient Chinese courtyard with a stone lantern and bamboo, empty, no people', emotion: 'neutral', action: 'idle', side: 'center', transition: 'auto' },
  varyBy: ['side', 'emotion'],
  minSeconds: 4,
  // `background`: the picture is only the set; the series' character pictures are not sent with it.
  image: { promptKey: 'imagePrompt', style: '', background: true, compose: () => 'An empty set with no people, animals or characters; keep the middle-bottom of the frame clear.' },
  normalize: (p) => ({ ...p, caption: p.caption.trim().slice(0, 60), imagePrompt: p.imagePrompt.trim() }),
});
