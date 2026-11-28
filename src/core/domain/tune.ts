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

/** A looping movement laid over whatever the figure already does. */
export const ANIMS = ['bounce', 'jump', 'sway', 'shake', 'nod', 'pulse', 'float', 'spin', 'pace'] as const;

const clamped = (min: number, max: number, fallback: number) => z.number().catch(fallback).transform((n) => Math.round(Math.min(max, Math.max(min, n)) * 1000) / 1000);
/** Left out (or null from a model) means "no limit", so a bad value never becomes a number. */
const seconds = (min: number) => z.number().transform((n) => Math.round(Math.min(60, Math.max(min, n)) * 10) / 10).optional().catch(undefined);
const anim = z.object({
  type: z.enum(ANIMS),
  speed: clamped(0.3, 3, 1),
  power: clamped(0.3, 2, 1),
  /** Seconds after the figure appears before it starts moving, and for how long; without `lasts` it keeps going. */
  start: seconds(0),
  lasts: seconds(0.3),
});
export type Anim = z.output<typeof anim>;

/** Where an animated figure is at second `t`: x as a share of its own width, y (up) of its height, degrees, scales. */
export function animAt(a: Anim | undefined, t: number): { x: number; y: number; rotate: number; sx: number; sy: number } {
  const rest = { x: 0, y: 0, rotate: 0, sx: 1, sy: 1 };
  if (!a) return rest;
  // The movement counts from its own start, so a jump always leaves from the ground.
  const own = t - (a.start ?? 0);
  if (own < 0 || (a.lasts !== undefined && own >= a.lasts)) return rest;
  // A limited movement settles over its last moments instead of snapping back.
  const k = a.power * (a.lasts === undefined ? 1 : Math.min(1, (a.lasts - own) / 0.25));
  const p = own * a.speed * Math.PI * 2;
  const wave = Math.sin(p);
  switch (a.type) {
    case 'bounce':
      return { ...rest, y: Math.abs(Math.sin(p / 2)) * 0.05 * k, sy: 1 + Math.cos(p) * 0.03 * k, sx: 1 - Math.cos(p) * 0.02 * k };
    case 'jump':
      return { ...rest, y: Math.max(0, Math.sin(p * 0.6)) * 0.18 * k };
    case 'sway':
      return { ...rest, rotate: Math.sin(p * 0.5) * 6 * k };
    case 'shake':
      return { ...rest, x: Math.sin(p * 8) * 0.012 * k };
    case 'nod':
      return { ...rest, rotate: Math.max(0, wave) * 7 * k };
    case 'pulse':
      return { ...rest, sx: 1 + wave * 0.06 * k, sy: 1 + wave * 0.06 * k };
    case 'float':
      return { ...rest, y: (0.04 + Math.sin(p * 0.4) * 0.04) * k };
    case 'spin':
      return { ...rest, rotate: (own * a.speed * 180) % 360 };
    case 'pace':
      return { ...rest, x: Math.sin(p * 0.2) * 0.3 * k, y: Math.abs(Math.sin(p)) * 0.015 };
  }
}

export const MAX_MOVES = 8;
/** What a figure does when it gets to the end of a leg. */
export const ARRIVE_EFFECTS = ['sparkle', 'flash', 'impact'] as const;
/** A keyframe's number: left out (or null) means "as it was before". */
const kept = (min: number, max: number) => z.number().transform((n) => Math.round(Math.min(max, Math.max(min, n)) * 1000) / 1000).optional().catch(undefined);
/** One step of what a figure does in a scene: from second `at` (since it appeared) it may change face and gesture,
 * and may travel, over `over` seconds, to `x`, `y` away from its resting place (shares of the frame, right and up). */
const move = z.object({
  at: clamped(0, 60, 0),
  over: clamped(0.1, 20, 1),
  x: kept(-1.2, 1.2),
  y: kept(-0.6, 0.8),
  scale: kept(0.3, 2.2),
  /** People only. */
  action: z.enum(['idle', 'talk', 'wave', 'point']).optional().catch(undefined),
  emotion: z.enum(['neutral', 'happy', 'angry', 'sad', 'surprised']).optional().catch(undefined),
  /** Turns round and round on the way. */
  spin: z.boolean().optional().catch(undefined),
  /** Height of the curve it flies along (share of the frame); absent = a straight line. */
  arc: z.number().min(-0.6).max(0.6).optional().catch(undefined),
  /** A movement it keeps up there until the next leg. */
  then: z.enum(ANIMS).optional().catch(undefined),
  effect: z.enum(ARRIVE_EFFECTS).optional().catch(undefined),
});
export type Move = z.output<typeof move>;
const moves = z.array(move).transform((list) => (list.length ? list.slice(0, MAX_MOVES).sort((a, b) => a.at - b.at) : undefined)).optional().catch(undefined);

/** The face and gesture the steps have set by second `t`; undefined = the scene's own. */
export function actingAt(list: Move[] | undefined, t: number): Pick<Move, 'action' | 'emotion'> {
  const now: Pick<Move, 'action' | 'emotion'> = {};
  for (const step of list ?? []) {
    if (t < step.at) break;
    if (step.action) now.action = step.action;
    if (step.emotion) now.emotion = step.emotion;
  }
  return now;
}

export interface Walk {
  x: number;
  y: number;
  scale: number;
  going: boolean;
  /** Degrees turned on the way. */
  spin: number;
  /** The leg it last finished, and how long ago. */
  there: { leg: Move; for: number } | null;
}

/** Where the legs have taken a figure at second `t`. */
export function moveAt(list: Move[] | undefined, t: number): Walk {
  let here = { x: 0, y: 0, scale: 1 };
  let there: Walk['there'] = null;
  for (const leg of list ?? []) {
    if (t < leg.at) break;
    const k = Math.min(1, (t - leg.at) / leg.over);
    const eased = k * k * (3 - 2 * k);
    const goal = { x: leg.x ?? here.x, y: leg.y ?? here.y, scale: leg.scale ?? here.scale };
    const travels = goal.x !== here.x || goal.y !== here.y || Boolean(leg.arc) || Boolean(leg.spin);
    const next = { x: here.x + (goal.x - here.x) * eased, y: here.y + (goal.y - here.y) * eased, scale: here.scale + (goal.scale - here.scale) * eased };
    if (k < 1) return { ...next, y: next.y + Math.sin(eased * Math.PI) * (leg.arc ?? 0), going: travels, spin: leg.spin ? eased * 720 : 0, there: null };
    here = next;
    there = { leg, for: t - leg.at - leg.over };
  }
  return { ...here, going: false, spin: 0, there };
}

/** Offsets are fractions of the frame (right and down are positive). */
const placement = z.object({ dx: clamped(-0.8, 0.8, 0), dy: clamped(-0.8, 0.8, 0), scale: clamped(0.3, 2.2, 1), anim: anim.optional().catch(undefined), moves });
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
  anim: anim.optional().catch(undefined),
  moves,
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
    if (p && !p.dx && !p.dy && p.scale === 1 && !p.anim && !p.moves) delete tune[layer];
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
const aiAnim = z
  .object({ type: z.enum([...ANIMS, 'none']).describe('none = bỏ hoạt ảnh; bounce nhún, jump nhảy lên, sway lắc lư, shake run rẩy, nod cúi gật, pulse phập phồng, float bay lơ lửng, spin xoay tròn, pace đi qua lại'), speed: z.number().nullable().describe('Nhịp 0.3..3, 1 là vừa'), power: z.number().nullable().describe('Độ mạnh 0.3..2, 1 là vừa'), start: z.number().nullable().describe('Bắt đầu cử động sau khi hình hiện bao nhiêu giây; null = ngay'), lasts: z.number().nullable().describe('Cử động trong bao nhiêu giây; null = đến khi hình biến mất') })
  .nullable()
  .describe('Hoạt ảnh lặp lại làm hình cử động; null = giữ như cũ, type none = bỏ');
const aiMoves = z
  .array(
    z.object({
      at: z.number().describe('Giây bắt đầu bước, tính từ lúc hình hiện'),
      over: z.number().describe('Di chuyển, đổi cỡ mất bao nhiêu giây'),
      emotion: z.enum(EXTRA_EMOTIONS).nullable().describe('Người: đổi biểu cảm từ bước này; null = giữ'),
      action: z.enum(EXTRA_ACTIONS).nullable().describe('Người: đổi hành động từ bước này; null = giữ'),
      x: z.number().nullable().describe('Đi tới: lệch ngang so với chỗ đứng gốc, phần chiều rộng khung, phải là dương; null = đứng nguyên'),
      y: z.number().nullable().describe('Đi tới: lệch cao so với chỗ đứng gốc, phần chiều cao khung, lên là dương; null = giữ'),
      scale: z.number().nullable().describe('Cỡ khi tới (1 = chuẩn, lớn hơn = to ra); null = giữ'),
      spin: z.boolean().nullable().describe('Xoay tít khi bay (vật phẩm)'),
      arc: z.number().nullable().describe('Độ cong đường đi -0.6..0.6; null = thẳng'),
      then: z.enum(ANIMS).nullable().describe('Cử động giữ ở đó đến bước sau, ví dụ pulse, shake'),
      effect: z.enum(ARRIVE_EFFECTS).nullable().describe('Khi tới: sparkle lấp lánh, flash loé sáng, impact va đập'),
    }),
  )
  .nullable()
  .describe(`DIỄN BIẾN của hình này trong cảnh (null = giữ như cũ, [] = bỏ hết), tối đa ${MAX_MOVES} bước theo thời gian (đổi biểu cảm, hành động, di chuyển). Ví dụ vòng bay ra giữa to dần rồi nhấp nháy, lao vào đối thủ, bay về = 3 bước. x, y là ĐỘ LỆCH so với chỗ đứng gốc. Chỗ đứng gốc (ngang 0..1): vai chính left .27, center .5, right .73; nhân vật phụ ở phía đối diện; vật phẩm cạnh vai chính (±.17, cao hơn); người, vật thêm ở đúng x của nó. Về chỗ cũ là x 0, y 0`);
const aiPlace = z.object({ moves: aiMoves, anim: aiAnim,  dx: z.number().describe('-0.8..0.8, phần chiều rộng khung, phải là dương'), dy: z.number().describe('-0.8..0.8, phần chiều cao khung, xuống là dương'), scale: z.number().describe('0.3..2.2, 1 là cỡ chuẩn') });
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
  anim: aiAnim,
  moves: aiMoves,
  time: aiSpan.nullable(),
});
const TUNE_NAMES = ['hero', 'companion', 'item', 'extras', 'holdSec', ...TIMED, 'voiceDelay', 'sfxVolume', 'captionLook', 'captionPlace', 'voiceStyle', 'voiceSpeed'] as const;

export const TunePatchSchema = z.object({
  hero: aiPlace.nullable().describe('Dời, đổi cỡ vai chính'),
  companion: aiPlace.nullable().describe('Dời, đổi cỡ nhân vật phụ (ô companion)'),
  item: aiPlace.nullable().describe('Dời, đổi cỡ vật phẩm (ô item)'),
  extras: z.array(aiExtra).nullable().describe(`Người, vật THÊM vào khung ngoài ba ô trên (tối đa ${MAX_EXTRAS}, chỉ cảnh nhân vật diễn). Khi đổi thì đưa đủ những ai có mặt (thiếu = bỏ khỏi khung); mục không nói tới của người đã có được giữ`),
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
/** What must be named to know which thing a partial entry is about. */
const NEEDED = new Set(['id', 'type', 'at', 'from']);

/** The same schema where everything else may be left out, at any depth; descriptions are kept. */
function lenient(schema: z.ZodType): z.ZodType {
  let out: z.ZodType = schema;
  if (schema instanceof z.ZodNullable) out = lenient(schema.unwrap() as z.ZodType).nullable();
  else if (schema instanceof z.ZodArray) out = z.array(lenient(schema.element as z.ZodType));
  else if (schema instanceof z.ZodObject) out = z.object(Object.fromEntries(Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, value]) => [key, NEEDED.has(key) ? lenient(value) : lenient(value).optional()])));
  return schema.description && out !== schema ? out.describe(schema.description) : out;
}

export type TunePatch = {
  [K in Exclude<keyof z.output<typeof TunePatchSchema>, 'extras' | TuneLayer>]?: z.output<typeof TunePatchSchema>[K];
} & {
  [K in TuneLayer]?: (Partial<z.output<typeof aiPlace>> & object) | null;
} & { extras?: (Partial<z.output<typeof aiExtra>> & { id: string; kind?: Extra['kind'] })[] | null };

/** For a chat tool: send only what changes. */
export const ToolTuneSchema = lenient(TunePatchSchema) as unknown as z.ZodType<TunePatch>;

const withoutNulls = (value: object) => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined));

/** Applies a patch on top of what the scene has: a key that is null or missing is kept, at every level. */
export function patchTune(old: SceneTune, patch: TunePatch): SceneTune | null {
  const { reset, extras, hero, companion, item, ...rest } = patch;
  const next: Record<string, unknown> = { ...old };
  for (const key of reset ?? []) delete next[key];
  Object.assign(next, withoutNulls(rest));
  for (const [layer, change] of Object.entries({ hero, companion, item })) {
    if (change) next[layer] = { dx: 0, dy: 0, scale: 1, ...(next[layer] as object | undefined), ...withoutNulls(change) };
  }
  if (extras) {
    // The list says who is on stage; one already there (same id, in order) keeps what the patch does not mention.
    const had = [...((next.extras as Extra[] | undefined) ?? [])];
    const done: Extra[] = [];
    for (const e of extras) {
      const i = had.findIndex((x) => x.id === e.id);
      const before = i >= 0 ? had.splice(i, 1)[0]! : newExtra(e.id, e.kind ?? 'person', done);
      done.push({ ...before, ...(withoutNulls(e) as Partial<Extra>) });
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
