import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { ChartSceneProps } from '@video/blocks';
import { parseChart } from '@video/blocks/chart-data';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  title: z.string().describe('Tiêu đề biểu đồ, tối đa 40 ký tự, nói so sánh điều gì (ví dụ "Độ sâu: Everest và Mariana")'),
  unit: z.string().describe('Đơn vị của các số, tối đa 10 ký tự (ví dụ "m", "%", "tỷ"); có thể để trống'),
  data: z.string().describe('2-6 dòng, mỗi dòng "Tên: số" (ví dụ "Everest: 8849"). Số chỉ gồm chữ số; chỉ dùng số chắc chắn đúng'),
  transition: TransitionEnum,
});
export type _ChartMatchesComponent = Assert<Same<z.infer<typeof props>, ChartSceneProps>>;

/** Sounds for a chart: a soft sweep as the bars start, a thud when the biggest one lands. */
export function chartCues({ props }: { props: Record<string, unknown> }): SfxCue[] {
  const rows = parseChart(String(props.data ?? '')).length;
  return [{ kind: 'whoosh-soft', at: 0.3, volume: 0.25 }, { kind: 'impact', at: (14 + 11 * rows - rows * rows * 0.6 + 20) / 30, volume: 0.28 }];
}

export const chartBlock = defineBlock({
  id: 'chart',
  name: 'Biểu đồ cột',
  summary: 'So sánh 2-6 số bằng các cột chạy ra, cột lớn nhất sáng màu nhấn',
  aiGuide:
    'Cảnh SO SÁNH số liệu (2-6 mục): mỗi dòng trong data là "Tên: số". Cột lớn nhất tự nổi bật nên sắp ý chính vào đó. Chỉ dùng số chắc chắn đúng, cùng một đơn vị. Lời đọc nêu kết luận của so sánh, không đọc lại hết số. Tối đa 1 cảnh mỗi video.',
  props,
  fields: [
    { key: 'title', label: 'Tiêu đề', kind: 'text', maxLength: 44 },
    { key: 'unit', label: 'Đơn vị', kind: 'text', maxLength: 10 },
    { key: 'data', label: 'Số liệu (mỗi dòng "Tên: số")', kind: 'textarea', maxLength: 300, hint: 'Ví dụ: Everest: 8849' },
    { key: 'transition', label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { title: 'Độ sâu so với độ cao', unit: 'm', data: 'Everest: 8849\nMariana: 10994', transition: 'auto' },
  minSeconds: 5,
  sfx: chartCues,
  normalize: (p) => ({ ...p, title: p.title.trim().slice(0, 44), unit: p.unit.trim().slice(0, 10), data: parseChart(p.data).map((i) => `${i.label}: ${i.shown}`).join('\n') }),
});
