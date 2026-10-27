import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { GaugeSceneProps } from '@video/blocks';
import { parseNumber } from '@video/blocks/data-parse';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  value: z.string().describe('Giá trị cần đọc trên đồng hồ, chỉ chữ số và dấu phân cách (ví dụ "72", "3,5"); phải nằm giữa min và max. Chỉ dùng số chắc chắn đúng'),
  min: z.string().describe('Cận dưới của thang đo (ví dụ "0")'),
  max: z.string().describe('Cận trên của thang đo (ví dụ "100", "200")'),
  unit: z.string().describe('Đơn vị ngắn, tối đa 10 ký tự (ví dụ "%", "km/h", "°C"); có thể để trống'),
  caption: z.string().describe('Dòng chú thích dưới số, tối đa 60 ký tự, nói số đo cái gì'),
  transition: TransitionEnum,
});
export type _GaugeMatchesComponent = Assert<Same<z.infer<typeof props>, GaugeSceneProps>>;

/** Sounds for a gauge: ticks while the needle is thrown to the end of the scale and back, a thud as it settles. */
export function gaugeCues(): SfxCue[] {
  return [{ kind: 'whoosh', at: 0.2, volume: 0.3 }, ...Array.from({ length: 5 }, (_, i) => ({ kind: 'tick' as const, at: 1.0 + i * 0.13, volume: 0.16 })), { kind: 'stamp', at: 1.9, volume: 0.28 }];
}

export const gaugeBlock = defineBlock({
  id: 'gauge',
  name: 'Đồng hồ kim',
  summary: 'Kim đồng hồ quét hết thang đo rồi về đúng giá trị, kèm số đếm',
  aiGuide:
    'Cảnh ĐỌC MỘT SỐ ĐO trên thang có đầu mút (tỉ lệ phần trăm, tốc độ, nhiệt độ, mức độ): value nằm giữa min và max. Lời đọc nêu số đo (viết bằng chữ) và ý nghĩa. Không bịa số. Tối đa 1 cảnh mỗi video; nếu chỉ muốn nhấn một con số thì dùng cảnh con số lớn.',
  props,
  fields: [
    { key: 'value', label: 'Giá trị', kind: 'text', maxLength: 12 },
    { key: 'min', label: 'Thang từ', kind: 'text', maxLength: 10 },
    { key: 'max', label: 'Thang đến', kind: 'text', maxLength: 10 },
    { key: 'unit', label: 'Đơn vị', kind: 'text', maxLength: 12 },
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 64 },
    { key: 'transition', label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { value: '72', min: '0', max: '100', unit: '%', caption: 'đại dương chưa được khám phá', transition: 'auto' },
  minSeconds: 5,
  sfx: gaugeCues,
  normalize: (p) => {
    const lo = parseNumber(p.min) ?? 0;
    const hi = Math.max(lo + 1, parseNumber(p.max) ?? 100);
    const v = Math.min(hi, Math.max(lo, parseNumber(p.value) ?? lo));
    const show = (n: number) => String(n).replace('.', ',');
    return { ...p, min: show(lo), max: show(hi), value: show(v), unit: p.unit.trim().slice(0, 12), caption: p.caption.trim().slice(0, 64) };
  },
});
