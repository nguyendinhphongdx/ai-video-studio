import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { DotsSceneProps } from '@video/blocks';
import { parseNumber } from '@video/blocks/data-parse';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  part: z.string().describe('Phần được nhấn, chỉ chữ số (ví dụ "3" trong "3 trên 10", "30" trong "30%"). Chỉ dùng số chắc chắn đúng'),
  whole: z.string().describe('Tổng (ví dụ "10" hoặc "100"). Nếu tổng nhỏ hơn 100 thì mỗi chấm là một đơn vị; lớn hơn thì mỗi chấm là một phần trăm'),
  caption: z.string().describe('Câu nói tỉ lệ đó là gì, tối đa 60 ký tự (ví dụ "người dân chưa từng thấy biển")'),
  transition: TransitionEnum,
});
export type _DotsMatchesComponent = Assert<Same<z.infer<typeof props>, DotsSceneProps>>;

export function dotsCues(): SfxCue[] {
  return [{ kind: 'whoosh-soft', at: 0.2, volume: 0.25 }, { kind: 'pop', at: 1.75, volume: 0.3 }, { kind: 'sparkle', at: 1.8, volume: 0.2 }];
}

export const dotsBlock = defineBlock({
  id: 'dots',
  name: 'Chấm tỉ lệ',
  summary: 'Đám chấm tụ lại thành lưới rồi sáng lên phần quan trọng ("3 trên 10")',
  aiGuide:
    'Cảnh NHẤN MỘT TỈ LỆ (3 trong 10 người, 30%, 1 trên 5): part là phần được nhấn, whole là tổng; số phần trăm tự hiện. Dễ hình dung hơn con số trần. Lời đọc nêu tỉ lệ (viết bằng chữ). Chỉ dùng số chắc chắn đúng. Tối đa 1 cảnh mỗi video.',
  props,
  fields: [
    { key: 'part', label: 'Phần được nhấn', kind: 'text', maxLength: 10 },
    { key: 'whole', label: 'Tổng', kind: 'text', maxLength: 10 },
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 64 },
    { key: 'transition', advanced: true, label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { part: '3', whole: '10', caption: 'người chưa từng thấy biển', transition: 'auto' },
  minSeconds: 5,
  sfx: dotsCues,
  normalize: (p) => {
    const whole = Math.max(1, parseNumber(p.whole) ?? 100);
    const part = Math.min(whole, Math.max(0, parseNumber(p.part) ?? 0));
    return { ...p, part: String(part).replace('.', ','), whole: String(whole).replace('.', ','), caption: p.caption.trim().slice(0, 64) };
  },
});
