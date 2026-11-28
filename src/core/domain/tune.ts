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
  return { id, kind, x: EXTRA_SPOTS[same % EXTRA_SPOTS.length]!, y: kind === 'item' ? 0.3 : 0, scale: 1, action: 'idle', emotion: 'neutral' };
}

export interface VoiceDelivery {
  style?: SceneTune['voiceStyle'];
  speed?: SceneTune['voiceSpeed'];
}

export function deliveryOf(props: Record<string, unknown>): VoiceDelivery {
  const { voiceStyle, voiceSpeed } = tuneOf(props);
  return { ...(voiceStyle ? { style: voiceStyle } : {}), ...(voiceSpeed ? { speed: voiceSpeed } : {}) };
}
