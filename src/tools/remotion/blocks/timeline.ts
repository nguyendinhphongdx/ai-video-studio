import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { TimelineSceneProps } from '@video/blocks';
import { parseTimeline } from '@video/blocks/data-parse';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  title: z.string().describe('Tiêu đề dòng thời gian, tối đa 40 ký tự (ví dụ "Từ tia lửa đến mặt trăng")'),
  data: z.string().describe('2-6 dòng, mỗi dòng "Mốc: sự kiện" theo thứ tự thời gian (ví dụ "1957: Vệ tinh đầu tiên bay vào quỹ đạo"). Mốc ngắn (năm, tháng), sự kiện tối đa 70 ký tự. Chỉ dùng mốc chắc chắn đúng'),
  transition: TransitionEnum,
});
export type _TimelineMatchesComponent = Assert<Same<z.infer<typeof props>, TimelineSceneProps>>;

/** Sounds for a timeline: a sweep as the view slides to each milestone, a pop when it stands up. */
export function timelineCues({ props, durationSec }: { props: Record<string, unknown>; durationSec: number }): SfxCue[] {
  const n = Math.max(1, parseTimeline(String(props.data ?? '')).length);
  const share = Math.max(24, (durationSec * 30 - 26) / n) / 30;
  const cues: SfxCue[] = [];
  for (let i = 1; i < n; i++) cues.push({ kind: 'whoosh-soft', at: 0.33 + i * share, volume: 0.22 }, { kind: 'pop', at: 0.33 + i * share + 0.5, volume: 0.25 });
  return cues;
}

export const timelineBlock = defineBlock({
  id: 'timeline',
  name: 'Dòng thời gian',
  summary: 'Camera trượt ngang dọc theo một dòng thời gian, mỗi mốc bật lên khi tới',
  aiGuide:
    'Cảnh TRÌNH TỰ SỰ KIỆN (2-6 mốc, theo thứ tự thời gian): mỗi dòng trong data là "Mốc: sự kiện". Lời đọc đi qua từng mốc theo nhịp, nhắc đúng mốc và sự kiện. Chỉ dùng mốc thời gian chắc chắn đúng. Mỗi mốc cần khoảng 2-3 giây nên cảnh dài tương ứng. Tối đa 1 cảnh mỗi video.',
  props,
  fields: [
    { key: 'title', label: 'Tiêu đề', kind: 'text', maxLength: 44 },
    { key: 'data', label: 'Các mốc (mỗi dòng "Mốc: sự kiện")', kind: 'textarea', maxLength: 500, hint: 'Ví dụ: 1969: Con người đặt chân lên Mặt Trăng' },
    { key: 'transition', label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { title: 'Đường tới Mặt Trăng', data: '1957: Vệ tinh đầu tiên\n1961: Người đầu tiên bay vào vũ trụ\n1969: Đặt chân lên Mặt Trăng', transition: 'auto' },
  minSeconds: 7,
  sfx: timelineCues,
  normalize: (p) => ({ ...p, title: p.title.trim().slice(0, 44), data: parseTimeline(p.data).map((i) => `${i.label}: ${i.text}`).join('\n') }),
});
