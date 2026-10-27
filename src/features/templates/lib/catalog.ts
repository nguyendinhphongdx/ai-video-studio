// One list of everything a scene can be made to do (text shots, entrances, camera moves, light effects, rhythm cuts,
// scene types), each with how to use it and a recipe to preview it. Pure data: the page only draws it.
import { MOTION_OPTIONS } from '@/tools/remotion/blocks/shared';
import { CUT_META } from '@video/shots/cut-meta';
import { ENTRANCE_META } from '@video/shots/entrance-meta';
import { FX_META } from '@video/shots/fx-meta';
import { TEXT_SHOT_META } from '@video/shots/text/meta';

export type TemplateGroup = 'text' | 'entrance' | 'camera' | 'fx' | 'cut' | 'block';

export const GROUPS: { id: TemplateGroup; label: string }[] = [
  { id: 'text', label: 'Chữ chuyển động' },
  { id: 'entrance', label: 'Cách mở cảnh' },
  { id: 'camera', label: 'Camera' },
  { id: 'fx', label: 'Hiệu ứng ánh sáng' },
  { id: 'cut', label: 'Cắt nhịp' },
  { id: 'block', label: 'Loại cảnh' },
];

export interface TemplateEntry {
  /** Unique across the whole list. */
  key: string;
  group: TemplateGroup;
  id: string;
  name: string;
  hint: string;
  /** Where it is set: the scene type, the property and its value. */
  use: { block: string; field: string | null; value: string | null };
  /** What "Chép tên" puts on the clipboard. */
  copy: string;
  /** What to draw for the live preview. */
  preview: { block: string; props: Record<string, unknown> };
  /** The preview needs a picture (a built-in sample is used; nothing is generated). */
  needsImage: boolean;
}

export interface BlockLike {
  ref: string;
  name: string;
  summary: string;
  defaults: Record<string, unknown>;
}

export const copyText = (use: TemplateEntry['use']): string => (use.field ? `${use.block} · ${use.field} = ${use.value}` : use.block);

const PICTURE = 'remotion/picture';
const KINETIC = 'remotion/kinetic';
const PICTURE_BASE = { caption: 'Mẫu xem thử', imagePrompt: 'sample', motion: 'zoom-in', fx: 'none', rhythm: 'none', shot: 'auto', transition: 'auto' };

function entry(group: TemplateGroup, id: string, name: string, hint: string, use: TemplateEntry['use'], preview: TemplateEntry['preview'], needsImage: boolean): TemplateEntry {
  return { key: `${group}:${id}`, group, id, name, hint, use, copy: copyText(use), preview, needsImage };
}

/** Everything, in the order of GROUPS. `blocks` come from the server (they depend on the installed tools). */
export function templateCatalog(blocks: BlockLike[] = []): TemplateEntry[] {
  const out: TemplateEntry[] = [];
  for (const m of TEXT_SHOT_META)
    out.push(entry('text', m.id, m.name, m.hint, { block: KINETIC, field: 'look', value: m.id }, { block: KINETIC, props: { text: 'Điều gì đang nằm dưới đáy biển?', emphasis: 'đáy', items: m.items ? 'Bí ẩn\nSâu thẳm\nChưa ai biết' : '', look: m.id, transition: 'none' } }, false));
  for (const e of ENTRANCE_META)
    out.push(entry('entrance', e.id, e.name, 'Cách cảnh hiện ra khi bắt đầu.', { block: PICTURE, field: 'transition', value: e.id }, { block: PICTURE, props: { ...PICTURE_BASE, transition: e.id } }, true));
  for (const o of MOTION_OPTIONS.filter((x) => x.value !== 'auto'))
    out.push(entry('camera', o.value, o.label, 'Chuyển động camera trên ảnh.', { block: PICTURE, field: 'motion', value: o.value }, { block: PICTURE, props: { ...PICTURE_BASE, motion: o.value, transition: 'none' } }, true));
  for (const f of FX_META.filter((x) => x.id !== 'none'))
    out.push(entry('fx', f.id, f.name, f.hint, { block: PICTURE, field: 'fx', value: f.id }, { block: PICTURE, props: { ...PICTURE_BASE, fx: f.id, transition: 'none' } }, true));
  for (const c of CUT_META.filter((x) => x.id !== 'none'))
    out.push(entry('cut', c.id, c.name, c.hint, { block: PICTURE, field: 'rhythm', value: c.id }, { block: PICTURE, props: { ...PICTURE_BASE, rhythm: c.id, transition: 'none' } }, true));
  for (const b of blocks) out.push(entry('block', b.ref, b.name, b.summary, { block: b.ref, field: null, value: null }, { block: b.ref, props: { ...b.defaults, transition: 'none' } }, 'imagePrompt' in b.defaults));
  return out;
}

/** Filter by group and by words in the name or hint (accents and case do not matter). */
export function filterTemplates(all: TemplateEntry[], group: TemplateGroup | 'all', query: string): TemplateEntry[] {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return all.filter((t) => (group === 'all' || t.group === group) && words.every((w) => fold(`${t.name} ${t.hint} ${t.id}`).includes(w)));
}

/** A built-in sample picture (a landscape drawn as SVG) so camera and entrance previews show real motion without any AI call. */
export const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#s)"/><circle cx="1280" cy="560" r="150" fill="#fff7ed" opacity=".95"/><path d="M0 760 L360 430 L640 690 L980 340 L1340 700 L1640 460 L1920 720 V1080 H0Z" fill="#312e81"/><path d="M0 900 L420 640 L760 860 L1120 600 L1520 880 L1920 700 V1080 H0Z" fill="#1e1b4b"/><rect x="900" y="640" width="26" height="150" fill="#fde68a"/><circle cx="913" cy="620" r="30" fill="#fde68a"/></svg>`,
)}`;
