import { z } from 'zod';

import type { SfxCue } from '@/core/audio/sfx';
import { defineBlock } from '@/core/tools/tool';
import type { KineticSceneProps } from '@video/blocks';
import { kineticLookFor } from '@video/blocks/variants';
import { TEXT_SHOT_META, type TextShotId } from '@video/shots/text/meta';

import { type Assert, type Same, TRANSITION_OPTIONS, TransitionEnum } from './shared';

const IDS = TEXT_SHOT_META.map((m) => m.id) as [TextShotId, ...TextShotId[]];

const props = z.object({
  text: z.string().describe('Một câu ngắn, tối đa 70 ký tự, là điều người xem cần nhớ (một câu hỏi, một nhận định, một con số bằng chữ). Với kiểu xoay nhiều ý, đây là phần câu đứng yên. Không viết cả đoạn'),
  emphasis: z.string().describe('MỘT từ trong câu cần nhấn (hiện màu nhấn của kênh); để trống thì lấy từ dài nhất'),
  items: z.string().default('').describe('Các dòng cho kiểu xoay nhiều ý (mỗi dòng một ý ngắn, 2-6 dòng); để trống nếu dùng kiểu một câu'),
  look: z.enum(['auto', ...IDS]).default('auto').describe('Kiểu chữ chuyển động; để "auto" để hệ thống đổi luân phiên giữa các cảnh'),
  transition: TransitionEnum,
});
export type _KineticMatchesComponent = Assert<Same<z.infer<typeof props>, KineticSceneProps>>;

const ENTRANCE_IMPACT = new Set<string>(['zoom-assemble', 'letter-drop', 'outline-ring', 'paper-stamp', 'brace-expand']);
const TICKING = new Set<string>(['typewriter', 'glitch-cycle', 'type-retype']);

/** Sounds for a kinetic scene: a slam for the heavy entrances, ticks for typing, a tick per change for the cycling ones. */
export function kineticCues({ props, ordinal, durationSec }: { props: Record<string, unknown>; ordinal: number; durationSec: number }): SfxCue[] {
  const items = String(props.items ?? '').split(/\r?\n/).filter((l) => l.trim()).length;
  const look = !props.look || props.look === 'auto' ? kineticLookFor(ordinal, items > 0) : String(props.look);
  const meta = TEXT_SHOT_META.find((m) => m.id === look);
  if (TICKING.has(look)) return [0.3, 0.45, 0.6, 0.75, 0.9, 1.05].map((at) => ({ kind: 'tick' as const, at }));
  if (meta?.items) {
    const beat = Math.max(0.5, (durationSec - 1.4) / Math.max(1, items));
    return Array.from({ length: Math.max(1, items) }, (_, i) => ({ kind: 'pop' as const, at: 0.4 + i * beat, volume: 0.22 }));
  }
  if (ENTRANCE_IMPACT.has(look)) return [{ kind: 'impact', at: 0.12, volume: 0.42 }];
  return [{ kind: 'whoosh-soft', at: 0.05, volume: 0.26 }];
}

const lookList = `một câu: ${TEXT_SHOT_META.filter((m) => !m.items).map((m) => m.id).join(', ')}; xoay nhiều ý (cần items): ${TEXT_SHOT_META.filter((m) => m.items).map((m) => m.id).join(', ')}`;

export const kineticBlock = defineBlock({
  id: 'kinetic',
  name: 'Chữ chuyển động',
  summary: `Một câu ngắn chuyển động theo ${TEXT_SHOT_META.length} kiểu: rơi lên, trượt mờ, gõ chữ, phóng từ khoá, viền rồi tô, đổi từ như máy xèng, cuộn dọc, nhiễu máy, tô sáng theo lời...`,
  aiGuide:
    `Cảnh chữ thuần, không cần ảnh: dùng cho CÂU CẦN NHỚ (câu hỏi lớn của video, nhận định then chốt, câu chốt trước phần kết). Tối đa 70 ký tự, MỘT từ nhấn. Dùng tiết kiệm: 1-2 cảnh mỗi video để nghỉ mắt giữa các cảnh ảnh, không dùng cho cảnh cần minh hoạ. Để look là auto (hệ thống tự đổi kiểu giữa các cảnh); chỉ chọn riêng khi cần. Muốn kiểu xoay nhiều ý (đổi từ, cuộn, nhiễu máy...) thì điền items (mỗi dòng một ý) và để look auto hoặc chọn kiểu cần items. Các kiểu: ${lookList}.`,
  props,
  fields: [
    { key: 'text', label: 'Câu chữ', kind: 'textarea', maxLength: 80, hint: 'Ngắn, một ý cần nhớ.' },
    { key: 'emphasis', label: 'Từ nhấn', kind: 'text', maxLength: 20 },
    { key: 'items', label: 'Các dòng (cho kiểu xoay nhiều ý)', kind: 'textarea', maxLength: 200, hint: 'Mỗi dòng một ý ngắn; để trống nếu chỉ một câu.' },
    { key: 'look', label: 'Kiểu chuyển động', kind: 'choice', options: [{ value: 'auto', label: 'Tự động (đổi luân phiên)' }, ...TEXT_SHOT_META.map((m) => ({ value: m.id, label: m.name }))] },
    { key: 'transition', label: 'Cách mở cảnh', kind: 'choice', options: TRANSITION_OPTIONS },
  ],
  defaults: { text: 'Điều gì đang nằm dưới đáy biển?', emphasis: 'đáy', items: '', look: 'auto', transition: 'auto' },
  minSeconds: 3.5,
  sfx: kineticCues,
  normalize: (p) => ({ ...p, text: p.text.trim().slice(0, 80), emphasis: p.emphasis.trim().split(/\s+/)[0]?.slice(0, 20) ?? '', items: p.items.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6).map((l) => l.slice(0, 40)).join('\n') }),
});
