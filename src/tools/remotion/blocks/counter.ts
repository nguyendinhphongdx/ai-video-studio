import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { CounterSceneProps } from '@video/blocks';

import { type Assert, type Same } from './shared';

const props = z.object({
  value: z.string().describe('Con số hiển thị, chỉ gồm chữ số và dấu chấm/phẩy phân cách, tối đa 10 ký tự (ví dụ "10.994", "25", "3,5"). Chỉ dùng số CHẮC CHẮN đúng'),
  unit: z.string().describe('Đơn vị ngắn đi sau số, tối đa 12 ký tự (ví dụ "mét", "cm/năm", "%", "triệu dân"); có thể để trống'),
  caption: z.string().describe('Dòng chú thích dưới số, tối đa 60 ký tự, nói số đó là gì (ví dụ "độ sâu của Rãnh Mariana")'),
});
export type _CounterMatchesComponent = Assert<Same<z.infer<typeof props>, CounterSceneProps>>;

/** Sounds for a counter: ticks while the digits roll, a soft thud when they land. */
export function counterCues({ props }: { props: Record<string, unknown> }): SfxCue[] {
  const digits = String(props.value ?? '').length;
  const settle = (4 + digits * 4 + 26) / 30;
  const ticks = Array.from({ length: Math.min(8, digits + 3) }, (_, i) => ({ kind: 'tick' as const, at: 0.2 + i * (settle - 0.3) / Math.min(8, digits + 3), volume: 0.12 }));
  return [...ticks, { kind: 'stamp', at: settle, volume: 0.3 }];
}

export const counterBlock = defineBlock({
  id: 'counter',
  name: 'Con số lớn',
  summary: 'Một con số lớn lăn lên như đồng hồ công tơ mét, kèm đơn vị và chú thích',
  aiGuide:
    'Cảnh nhấn MỘT con số gây ấn tượng (số liệu then chốt của video: độ sâu, tuổi, giá, tỉ lệ). value chỉ chứa chữ số và dấu phân cách; unit ngắn; caption nói số đó là gì. Lời đọc phải nêu đúng con số (viết bằng chữ). Không bịa số: không chắc thì dùng cảnh khác. Tối đa 1-2 cảnh mỗi video.',
  props,
  fields: [
    { key: 'value', label: 'Con số', kind: 'text', maxLength: 12 },
    { key: 'unit', label: 'Đơn vị', kind: 'text', maxLength: 14 },
    { key: 'caption', label: 'Chú thích', kind: 'text', maxLength: 64 },
  ],
  defaults: { value: '10.994', unit: 'mét', caption: 'độ sâu của Rãnh Mariana' },
  minSeconds: 4.5,
  sfx: counterCues,
  normalize: (p) => ({ ...p, value: p.value.replace(/[^\d.,]/g, '').slice(0, 12) || '0', unit: p.unit.trim().slice(0, 14), caption: p.caption.trim().slice(0, 64) }),
});
