import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { UiSceneProps } from '@video/blocks';
import { uiItems, uiTarget } from '@video/blocks/ui-data';
import { uiLookFor } from '@video/blocks/variants';
import { CLICK_FRAME, UI_LOOK_META, UI_LOOK_IDS } from '@video/shots/ui/meta';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const props = z.object({
  title: z.string().describe('Tên của thứ đang được trình bày: sản phẩm, tính năng hoặc câu hỏi cho ô tìm kiếm, tối đa 40 ký tự'),
  items: z.string().describe('Các mục hiện trong cửa sổ, mỗi dòng một mục ngắn (tối đa 28 ký tự), 3-6 dòng; mục cuối thường là mục quan trọng nhất'),
  target: z.string().describe('Mục con trỏ chọn hoặc nhấn: số thứ tự (1 là mục đầu) hoặc đúng chữ của mục; để trống thì lấy mục cuối. Chỉ có tác dụng với kiểu có con trỏ'),
  look: z.enum(['auto', ...UI_LOOK_IDS]).default('auto').describe('Kiểu diễn trong cửa sổ; để "auto" để hệ thống đổi luân phiên giữa các cảnh'),
  transition: TransitionEnum,
});
export type _UiMatchesComponent = Assert<Same<z.infer<typeof props>, UiSceneProps>>;

const CLICKS = new Set<string>(UI_LOOK_META.filter((m) => m.click).map((m) => m.id));

/** A soft sweep as the window opens, a tick when the cursor clicks, a pop per item for the lists. */
export function uiCues({ props, ordinal, durationSec }: { props: Record<string, unknown>; ordinal: number; durationSec: number }): SfxCue[] {
  const look = !props.look || props.look === 'auto' ? uiLookFor(ordinal) : String(props.look);
  const n = uiItems(String(props.items ?? '')).length || 3;
  const cues: SfxCue[] = [{ kind: 'whoosh-soft', at: 0.05, volume: 0.24 }];
  if (CLICKS.has(look)) cues.push({ kind: 'tick', at: CLICK_FRAME / 30, volume: 0.4 });
  else for (let i = 0; i < Math.min(n, 4); i++) cues.push({ kind: 'pop', at: 0.25 + i * 0.25, volume: 0.2 });
  return cues.filter((c) => c.at < durationSec - 0.3);
}

export const uiBlock = defineBlock({
  id: 'ui',
  name: 'Cửa sổ phần mềm',
  summary: `Một cửa sổ ứng dụng trình bày nội dung bằng ${UI_LOOK_META.length} kiểu: thẻ bay vào, danh sách trượt, con trỏ chọn, lọc theo nhãn, bật công tắc, gõ tìm kiếm, thông báo, chuyển tab, thanh tiến trình`,
  aiGuide:
    `Cảnh GIỚI THIỆU PHẦN MỀM, ứng dụng, tính năng hoặc cách thao tác (kênh công nghệ, hướng dẫn, so sánh công cụ): nội dung hiện trong một cửa sổ với con trỏ và hiệu ứng giao diện. title là tên thứ đang nói tới, items 3-6 dòng ngắn, target chọn mục con trỏ bấm (kiểu có con trỏ). Để look là auto; chỉ chọn riêng khi cần: ${UI_LOOK_META.map((m) => `${m.id} (${m.hint.replace(/\.$/, '')})`).join('; ')}. Không dùng cho chủ đề không liên quan phần mềm; 1-2 cảnh mỗi video.`,
  props,
  fields: [
    { key: 'title', label: 'Tên / câu hỏi', kind: 'text', maxLength: 40 },
    { key: 'items', label: 'Các mục (mỗi dòng một mục)', kind: 'textarea', maxLength: 180, hint: '3-6 dòng ngắn.' },
    { key: 'target', label: 'Mục con trỏ chọn', kind: 'text', maxLength: 28, hint: 'Số thứ tự (1 là mục đầu) hoặc đúng chữ của mục.' },
    { key: 'look', advanced: true, label: 'Kiểu diễn', kind: 'choice', options: [{ value: 'auto', label: 'Tự động (đổi luân phiên)' }, ...UI_LOOK_META.map((m) => ({ value: m.id, label: m.name }))] },
    { key: 'transition', advanced: true, label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { title: 'Trợ lý ghi chú', items: 'Ghi âm cuộc họp\nTóm tắt tự động\nDịch sang tiếng Anh\nGửi cho cả nhóm', target: '2', look: 'auto', transition: 'auto' },
  minSeconds: 5,
  sfx: uiCues,
  normalize: (p) => {
    const items = uiItems(p.items).map((l) => l.slice(0, 28));
    return { ...p, title: p.title.trim().slice(0, 40), items: items.join('\n'), target: String(uiTarget(p.target, items) + 1) };
  },
});
