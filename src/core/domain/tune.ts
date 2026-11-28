// Hand adjustments of one scene, on top of what its block draws: where each figure stands and how big it is, the pause
// at the end, sound effects, caption look, and how the voice reads. Kept in the scene props under TUNE_KEY, so every
// block gets them without declaring them; anything unset keeps the automatic behaviour.
import { z } from 'zod';

export const TUNE_KEY = '_tune';

export const TUNE_LAYERS = ['hero', 'companion', 'item'] as const;
export type TuneLayer = (typeof TUNE_LAYERS)[number];
export const CAPTION_LOOKS = ['bar', 'pill', 'chip', 'ribbon'] as const;
export const CAPTION_PLACES = ['top', 'bottom', 'off'] as const;
export const VOICE_STYLES = ['cheerful', 'gentle', 'dramatic', 'whisper'] as const;
export const VOICE_SPEEDS = ['slow', 'fast'] as const;
export const MAX_HOLD_SEC = 5;
export const MAX_VOICE_DELAY_SEC = 10;
/** Layers whose time on screen can be chosen; the others last the whole scene. */
export const TIMED = ['captionTime', 'heroTime', 'companionTime', 'itemTime', 'effectTime'] as const;
export type TimedKey = (typeof TIMED)[number];

const clamped = (min: number, max: number, fallback: number) => z.number().catch(fallback).transform((n) => Math.round(Math.min(max, Math.max(min, n)) * 1000) / 1000);
/** Offsets are fractions of the frame (right and down are positive). */
const placement = z.object({ dx: clamped(-0.8, 0.8, 0), dy: clamped(-0.8, 0.8, 0), scale: clamped(0.3, 2.2, 1) });
export type Placement = z.output<typeof placement>;

/** Seconds from the scene start; no `to` means until the scene ends. */
const span = z.object({ from: clamped(0, 60, 0), to: clamped(0, 60, 0).optional() }).transform(({ from, to }) => (to !== undefined && to > from ? { from, to } : { from }));
export type Span = z.output<typeof span>;

/** Whether a layer is on screen at second `t`, and how long it has been (its own entrance counts from there). */
export const spanAt = (at: Span | undefined, t: number): { on: boolean; local: number } => (at ? { on: t >= at.from && (at.to === undefined || t < at.to), local: t - at.from } : { on: true, local: t });

export const MAX_EXTRAS = 8;
/** How an added figure comes in, and how an added thing moves. */
export const EXTRA_ENTERS = ['fade', 'left', 'right', 'pop'] as const;
export const ITEM_MOTIONS = ['float', 'still', 'spin'] as const;
export const EXTRA_ACTIONS = ['idle', 'talk', 'wave', 'point'] as const;
export const EXTRA_EMOTIONS = ['neutral', 'happy', 'angry', 'sad', 'surprised'] as const;

/** One more person or thing on a drawn-figure scene, beyond the hero, companion and item. */
const extra = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/),
  kind: z.enum(['person', 'item']).catch('person'),
  /** Centre of the feet (or of the thing) as a share of the width, and height above its resting line. */
  x: clamped(-0.1, 1.1, 0.5),
  y: clamped(-0.2, 0.8, 0),
  scale: clamped(0.3, 2.2, 1),
  action: z.enum(EXTRA_ACTIONS).catch('idle'),
  emotion: z.enum(EXTRA_EMOTIONS).catch('neutral'),
  /** Faces the other way. */
  flip: z.boolean().catch(false),
  /** Stands in front of the hero instead of behind. */
  front: z.boolean().catch(false),
  enter: z.enum(EXTRA_ENTERS).catch('fade'),
  /** Things only. */
  motion: z.enum(ITEM_MOTIONS).catch('float'),
  glow: z.boolean().catch(true),
  time: span.optional().catch(undefined),
});
export type Extra = z.output<typeof extra>;

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const TuneSchema = z.object({
  hero: optional(placement),
  companion: optional(placement),
  item: optional(placement),
  extras: optional(z.array(extra).transform((list) => list.slice(0, MAX_EXTRAS))),
  holdSec: optional(clamped(0, MAX_HOLD_SEC, 0)),
  captionTime: optional(span),
  heroTime: optional(span),
  companionTime: optional(span),
  itemTime: optional(span),
  effectTime: optional(span),
  /** The voice starts this much later than usual; the scene grows to fit. */
  voiceDelay: optional(clamped(0, MAX_VOICE_DELAY_SEC, 0)),
  /** 0 mutes this scene's effects, 1 is the normal level. */
  sfxVolume: optional(clamped(0, 2, 1)),
  captionLook: optional(z.enum(CAPTION_LOOKS)),
  captionPlace: optional(z.enum(CAPTION_PLACES)),
  voiceStyle: optional(z.enum(VOICE_STYLES)),
  voiceSpeed: optional(z.enum(VOICE_SPEEDS)),
});
export type SceneTune = z.output<typeof TuneSchema>;

/** Valid adjustments only, defaults left out; null when nothing is adjusted (so the scene stores no key at all). */
export function parseTune(raw: unknown): SceneTune | null {
  const parsed = TuneSchema.safeParse(raw);
  if (!parsed.success) return null;
  const tune = parsed.data;
  for (const layer of TUNE_LAYERS) {
    const p = tune[layer];
    if (p && !p.dx && !p.dy && p.scale === 1) delete tune[layer];
  }
  if (!tune.holdSec) delete tune.holdSec;
  if (!tune.extras?.length) delete tune.extras;
  if (!tune.voiceDelay) delete tune.voiceDelay;
  if (tune.sfxVolume === 1) delete tune.sfxVolume;
  const entries = Object.entries(tune).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as SceneTune) : null;
}

export const tuneOf = (props: Record<string, unknown>): SceneTune => parseTune(props[TUNE_KEY]) ?? {};

/** Where a newly added figure stands: the first gap in this order, so additions do not pile up. */
const EXTRA_SPOTS = [0.1, 0.9, 0.36, 0.64, 0.22, 0.78, 0.04, 0.96];

export function newExtra(id: string, kind: Extra['kind'], existing: Extra[]): Extra {
  const same = existing.filter((e) => e.kind === kind).length;
  return { id, kind, x: EXTRA_SPOTS[same % EXTRA_SPOTS.length]!, y: kind === 'item' ? 0.3 : 0, scale: 1, action: 'idle', emotion: 'neutral', flip: false, front: false, enter: 'fade', motion: 'float', glow: true };
}

// What an AI may change, spelled out so a model sees every knob with its range. One shape for the in-screen fix and the
// assistant: a key that is null or left out is kept, a key named in `reset` goes back to automatic.
const aiPlace = z.object({ dx: z.number().describe('-0.8..0.8, phần chiều rộng khung, phải là dương'), dy: z.number().describe('-0.8..0.8, phần chiều cao khung, xuống là dương'), scale: z.number().describe('0.3..2.2, 1 là cỡ chuẩn') });
const aiSpan = z.object({ from: z.number().describe('Giây xuất hiện, tính từ đầu cảnh'), to: z.number().nullable().describe('Giây biến mất; null = đến hết cảnh') });
const aiExtra = z.object({
  id: z.string().describe('Id người hoặc vật trong dàn đã có ảnh'),
  x: z.number().nullable().describe('Vị trí ngang: 0 mép trái, 1 mép phải'),
  y: z.number().nullable().describe('Độ cao so với mặt đất, phần chiều cao khung (0 = đứng trên đất; vật phẩm thường 0.3)'),
  scale: z.number().nullable().describe('0.3..2.2, 1 là cỡ chuẩn'),
  action: z.enum(EXTRA_ACTIONS).nullable().describe('Người: idle đứng nghe, talk đang nói, wave vẫy tay, point chỉ tay'),
  emotion: z.enum(EXTRA_EMOTIONS).nullable().describe('Người: biểu cảm'),
  flip: z.boolean().nullable().describe('Quay mặt ngược lại'),
  front: z.boolean().nullable().describe('Đứng trước vai chính thay vì phía sau'),
  enter: z.enum(EXTRA_ENTERS).nullable().describe('Cách xuất hiện: fade hiện dần, left/right đi vào từ bên đó, pop bật ra'),
  motion: z.enum(ITEM_MOTIONS).nullable().describe('Vật phẩm: float lơ lửng, still đứng yên, spin xoay tròn'),
  glow: z.boolean().nullable().describe('Vật phẩm: toả sáng'),
  time: aiSpan.nullable(),
});
const TUNE_NAMES = ['hero', 'companion', 'item', 'extras', 'holdSec', ...TIMED, 'voiceDelay', 'sfxVolume', 'captionLook', 'captionPlace', 'voiceStyle', 'voiceSpeed'] as const;

export const TunePatchSchema = z.object({
  hero: aiPlace.nullable().describe('Dời, đổi cỡ vai chính'),
  companion: aiPlace.nullable().describe('Dời, đổi cỡ nhân vật phụ (ô companion)'),
  item: aiPlace.nullable().describe('Dời, đổi cỡ vật phẩm (ô item)'),
  extras: z.array(aiExtra).nullable().describe(`Người, vật THÊM vào khung ngoài ba ô trên (tối đa ${MAX_EXTRAS}, chỉ cảnh nhân vật diễn). Khi đổi thì đưa danh sách ĐẦY ĐỦ`),
  holdSec: z.number().nullable().describe(`Nghỉ cuối cảnh, 0..${MAX_HOLD_SEC} giây`),
  captionTime: aiSpan.nullable().describe('Lúc chữ hiện'),
  heroTime: aiSpan.nullable().describe('Lúc vai chính có mặt'),
  companionTime: aiSpan.nullable().describe('Lúc nhân vật phụ có mặt'),
  itemTime: aiSpan.nullable().describe('Lúc vật phẩm có mặt'),
  effectTime: aiSpan.nullable().describe('Lúc hiệu ứng hình, thời tiết chạy'),
  voiceDelay: z.number().nullable().describe(`Giọng đọc bắt đầu trễ thêm, 0..${MAX_VOICE_DELAY_SEC} giây`),
  sfxVolume: z.number().nullable().describe('Tiếng động của cảnh: 0 tắt, 1 chuẩn, tối đa 2'),
  captionLook: z.enum(CAPTION_LOOKS).nullable().describe('Kiểu chữ (cảnh tranh): bar dải mờ, pill viên trắng, chip thẻ màu, ribbon ruy băng'),
  captionPlace: z.enum(CAPTION_PLACES).nullable().describe('Chữ ở trên, dưới, hoặc off = ẩn'),
  voiceStyle: z.enum(VOICE_STYLES).nullable().describe('Giọng điệu: cheerful vui, gentle nhẹ nhàng, dramatic kịch tính, whisper thì thầm'),
  voiceSpeed: z.enum(VOICE_SPEEDS).nullable().describe('Tốc độ đọc'),
  reset: z.array(z.enum(TUNE_NAMES)).nullable().describe('Tên các chỉnh tay cần trả về tự động'),
});
/** The same knobs for a chat tool, where leaving a key out is allowed at every level that matters. */
export const ToolTuneSchema = TunePatchSchema.partial().extend({ extras: z.array(aiExtra.partial().required({ id: true })).optional().describe(TunePatchSchema.shape.extras.description!) });
export type TunePatch = Partial<Omit<z.output<typeof TunePatchSchema>, 'extras'>> & { extras?: (Partial<z.output<typeof aiExtra>> & { id: string; kind?: Extra['kind'] })[] | null };

const withoutNulls = (value: object) => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined));

export function patchTune(old: SceneTune, patch: TunePatch): SceneTune | null {
  const { reset, extras, ...rest } = patch;
  const next: Record<string, unknown> = { ...old };
  for (const key of reset ?? []) delete next[key];
  Object.assign(next, withoutNulls(rest));
  if (extras) {
    const done: Extra[] = [];
    for (const e of extras) {
      const kind = (e as { kind?: Extra['kind'] }).kind ?? 'person';
      done.push({ ...newExtra(e.id, kind, done), ...(withoutNulls(e) as Partial<Extra>) });
    }
    next.extras = done;
  }
  return parseTune(next);
}

export interface VoiceDelivery {
  style?: SceneTune['voiceStyle'];
  speed?: SceneTune['voiceSpeed'];
}

export function deliveryOf(props: Record<string, unknown>): VoiceDelivery {
  const { voiceStyle, voiceSpeed } = tuneOf(props);
  return { ...(voiceStyle ? { style: voiceStyle } : {}), ...(voiceSpeed ? { speed: voiceSpeed } : {}) };
}
