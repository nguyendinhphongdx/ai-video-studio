// The motion of a sprite puppet, as pure functions of time (no React), so Remotion draws them and tests can check them.
// A character is a set of whole-body sprites (one per expression); this file decides where the body is, how it
// moves (walk, jump, wave, breathe) and which sprite is showing (talking mouth, blink, emotion) at second `t`.
// The keyframe shape (t + x/y/scale/angle/alpha, smoothstep between keys) follows the layer keys of
// stickman-video-director (MIT), see NOTICE.

export const EXPRESSIONS = ['neutral', 'talk', 'blink', 'happy', 'angry', 'sad', 'surprised'] as const;
export type Expression = (typeof EXPRESSIONS)[number];
/** Emotions a scene can ask for; each maps to a sprite of the same name, falling back to neutral. */
export const EMOTIONS = ['neutral', 'happy', 'angry', 'sad', 'surprised'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** Body poses, in step with POSES in src/core/character/expressions.ts. Walk frames are drawn walking to the right. */
export const POSES = ['walk1', 'walk2', 'walk3', 'walk4', 'wave1', 'wave2', 'point', 'think', 'cross', 'bow', 'sit', 'crouch', 'leap', 'cheer'] as const;
export type Pose = (typeof POSES)[number];
export type SpriteKey = Expression | Pose;

export const ACTIONS = ['idle', 'enter', 'exit', 'walk', 'jump', 'wave', 'point', 'think', 'cross', 'bow', 'sit', 'cheer'] as const;
export type PuppetAction = (typeof ACTIONS)[number];
/** What a supporting character does while on stage; `talk` gives it the line (the hero listens). */
export const COMPANION_ACTIONS = ['idle', 'talk', 'wave', 'point'] as const;
export type CompanionAction = (typeof COMPANION_ACTIONS)[number];

export const SIDES = ['left', 'center', 'right'] as const;
export type Side = (typeof SIDES)[number];

/** Shot-relative keyframe; every channel is optional and holds its last value. */
export interface Keyframe {
  t: number;
  x?: number;
  y?: number;
  scale?: number;
  angle?: number;
  alpha?: number;
}

export interface PuppetPose {
  /** Horizontal centre of the feet, 0 = left edge of the stage, 1 = right edge (may leave 0..1 while walking on or off). */
  x: number;
  /** Lift above the ground line in stage heights (0 = standing). */
  y: number;
  scale: number;
  /** Degrees, positive = clockwise. */
  angle: number;
  alpha: number;
  /** Squash and stretch around the feet; 1 = none. */
  squashX: number;
  squashY: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (v: number) => {
  const x = clamp(v, 0, 1);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ANCHOR_X: Record<Side, number> = { left: 0.27, center: 0.5, right: 0.73 };
const EDGE_X: Record<Side, number> = { left: -0.18, center: -0.18, right: 1.18 };
const STEP_HZ = 2.4;
export const ENTER_SECONDS = 1.1;
export const EXIT_SECONDS = 0.9;
const WAVE_SECONDS = 2.4;
const BOW_FROM = 0.3;
const BOW_TO = 1.9;
const JUMP_PERIOD = 1.2;

const REST: PuppetPose = { x: 0.5, y: 0, scale: 1, angle: 0, alpha: 1, squashX: 1, squashY: 1 };

/** Value of one channel at time t from its keys (smoothstep between neighbours, held before the first and after the last). */
export function sampleKeys(keys: Keyframe[], t: number, channel: 'x' | 'y' | 'scale' | 'angle' | 'alpha', fallback: number): number {
  const pts = keys.filter((k) => typeof k[channel] === 'number').sort((a, b) => a.t - b.t);
  if (!pts.length) return fallback;
  if (t <= pts[0]!.t) return pts[0]![channel] as number;
  const last = pts[pts.length - 1]!;
  if (t >= last.t) return last[channel] as number;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (t >= a.t && t <= b.t) return lerp(a[channel] as number, b[channel] as number, smoothstep((t - a.t) / Math.max(1e-6, b.t - a.t)));
  }
  return fallback;
}

export function poseFromKeys(keys: Keyframe[], t: number, base: PuppetPose = REST): PuppetPose {
  return {
    ...base,
    x: sampleKeys(keys, t, 'x', base.x),
    y: sampleKeys(keys, t, 'y', base.y),
    scale: sampleKeys(keys, t, 'scale', base.scale),
    angle: sampleKeys(keys, t, 'angle', base.angle),
    alpha: sampleKeys(keys, t, 'alpha', base.alpha),
  };
}

/** One walking step: a bounce on each foot fall and a small sway, `phase` in steps. */
function stride(t: number): { y: number; angle: number; squashY: number } {
  const phase = t * STEP_HZ;
  const hop = Math.abs(Math.sin(phase * Math.PI));
  return { y: hop * 0.018, angle: Math.sin(phase * Math.PI) * 2.6, squashY: 1 - (1 - hop) * 0.035 };
}

/** Where the body is at second `t` of a scene lasting `duration` seconds. `framed`: the scene has pose sprites, so the
 * body need not fake the gesture by rocking (the wave frames move the arm). */
export function poseAt(action: PuppetAction, side: Side, t: number, duration: number, framed = false): PuppetPose {
  const anchor = ANCHOR_X[side];
  const breathe = 1 + Math.sin(t * 2.1) * 0.012;
  const idle: PuppetPose = { ...REST, x: anchor, scale: 1, squashY: breathe, squashX: 2 - breathe };
  switch (action) {
    case 'enter': {
      const k = smoothstep(t / ENTER_SECONDS);
      if (k >= 1) return idle;
      return { ...REST, x: lerp(EDGE_X[side], anchor, k), ...stride(t), scale: 1, squashX: 1 };
    }
    case 'exit': {
      const start = Math.max(0, duration - EXIT_SECONDS);
      if (t < start) return idle;
      const k = smoothstep((t - start) / EXIT_SECONDS);
      return { ...REST, x: lerp(anchor, EDGE_X[side], k), ...stride(t), squashX: 1 };
    }
    case 'walk': {
      const from = side === 'right' ? ANCHOR_X.left : ANCHOR_X.right;
      const k = clamp(t / Math.max(1, duration), 0, 1);
      return { ...REST, x: lerp(from, side === 'right' ? ANCHOR_X.right : ANCHOR_X.left, k), ...stride(t), squashX: 1 };
    }
    case 'jump': {
      const p = (t % JUMP_PERIOD) / JUMP_PERIOD;
      const arc = Math.sin(p * Math.PI);
      const land = p < 0.12 || p > 0.88 ? 0.06 : 0;
      return { ...idle, y: arc * 0.12, squashY: 1 - land + arc * 0.04, squashX: 1 + land };
    }
    case 'wave':
      return { ...idle, angle: !framed && t < WAVE_SECONDS ? Math.sin(t * 9) * 5 : 0 };
    case 'bow':
      // Dips a little while the bow frame shows.
      return { ...idle, y: t > BOW_FROM && t < BOW_TO ? -0.004 : 0 };
    default:
      return idle;
  }
}

/** Extra squash while the character talks: a quick, slightly uneven pulse, so it does not look like a metronome. */
export function talkBounce(t: number, talking: boolean): { y: number; squashY: number } {
  if (!talking) return { y: 0, squashY: 1 };
  const pulse = Math.abs(Math.sin(t * 7.3 + Math.sin(t * 2.1) * 1.4));
  return { y: pulse * 0.006, squashY: 1 + pulse * 0.02 };
}

/** Blinks every ~3.4 s for 0.14 s; `seed` keeps two characters from blinking together. */
export function isBlinking(t: number, seed = 0): boolean {
  const period = 3.4 + (seed % 5) * 0.23;
  const at = t + (seed % 7) * 0.6;
  return at % period < 0.14 && at > 0.4;
}

/** Mouth open or closed: switches ~6 times a second in an irregular but repeatable pattern. */
export function mouthOpen(t: number): boolean {
  const slot = Math.floor(t * 6);
  const h = Math.sin(slot * 12.9898) * 43758.5453;
  return h - Math.floor(h) > 0.38;
}

/** The sprite showing at `t`. Only names in `available` are returned; neutral is the last resort. */
export function expressionAt(opts: { emotion: Emotion; talking: boolean; t: number; available: readonly string[]; seed?: number }): Expression {
  const has = (e: Expression) => opts.available.includes(e);
  if (has('blink') && isBlinking(opts.t, opts.seed)) return 'blink';
  if (opts.talking && has('talk') && mouthOpen(opts.t)) return 'talk';
  if (opts.emotion !== 'neutral' && has(opts.emotion)) return opts.emotion;
  return 'neutral';
}

/** Whether the body is travelling across the stage at `t` (walk frames play then). */
export function isMoving(action: PuppetAction, t: number, duration: number): boolean {
  if (action === 'walk') return true;
  if (action === 'enter') return t < ENTER_SECONDS;
  if (action === 'exit') return t >= Math.max(0, duration - EXIT_SECONDS);
  return false;
}

/** The way the body travels: 1 = to the right, -1 = to the left (walk frames are mirrored then). */
export function heading(action: PuppetAction, side: Side): 1 | -1 {
  if (action === 'enter') return side === 'right' ? -1 : 1;
  if (action === 'exit') return side === 'right' ? 1 : -1;
  return side === 'right' ? 1 : -1;
}

const WALK_FRAMES: readonly Pose[] = ['walk1', 'walk2', 'walk3', 'walk4'];
const HELD: Partial<Record<PuppetAction, Pose>> = { point: 'point', think: 'think', cross: 'cross', sit: 'sit', cheer: 'cheer' };

export interface SpriteChoice {
  /** A standard sprite, or `pose:<id>` for one of the series' own poses. */
  sprite: SpriteKey | `pose:${string}`;
  /** Mirror the picture horizontally. */
  flip: boolean;
  /** A body pose is showing (no talking mouth or blink on it). */
  posed: boolean;
}

/**
 * The picture showing at `t`: a pose frame when the action has one and the series drew it (walk cycle while travelling,
 * two wave frames, crouch/leap for a jump, a held pose), else the talking/blinking/emotion face. Missing pose sprites fall
 * back to the face sprites, so a series with only expressions acts as before.
 */
export function spriteAt(opts: { action: PuppetAction; side: Side; emotion: Emotion; talking: boolean; t: number; duration: number; available: readonly string[]; seed?: number; pose?: string }): SpriteChoice {
  const { action, t } = opts;
  const has = (k: string) => opts.available.includes(k);
  const posed = (sprite: SpriteChoice['sprite'], flip = false): SpriteChoice => ({ sprite, flip, posed: true });
  const moving = isMoving(action, t, opts.duration);
  if (moving) {
    const frames = WALK_FRAMES.filter(has);
    if (frames.length >= 2) return posed(frames[Math.floor(t * STEP_HZ * 2) % frames.length]!, heading(action, opts.side) < 0);
  }
  // The series' own pose, held whenever the body stands (it wins over the action's standard gesture).
  const own = opts.pose ? (`pose:${opts.pose}` as const) : null;
  if (own && !moving && has(own)) return posed(own);
  if (action === 'wave' && t < WAVE_SECONDS && has('wave1') && has('wave2')) return posed(Math.floor(t * 4) % 2 ? 'wave2' : 'wave1');
  if (action === 'jump') {
    const p = (t % JUMP_PERIOD) / JUMP_PERIOD;
    const ground = p < 0.12 || p > 0.88;
    if (ground && has('crouch')) return posed('crouch');
    if (!ground && has('leap')) return posed('leap');
  }
  if (action === 'bow' && t > BOW_FROM && t < BOW_TO && has('bow')) return posed('bow');
  const held = HELD[action];
  if (held && has(held)) return posed(held);
  return { sprite: expressionAt(opts), flip: false, posed: false };
}

/** True when the series has the pose sprites `action` needs (so the body skips its fallback rocking). */
export function hasFrames(action: PuppetAction, available: readonly string[]): boolean {
  if (action === 'wave') return available.includes('wave1') && available.includes('wave2');
  return false;
}

/**
 * A supporting character's picture at `t`: one of its pose sprites (named by pose in `available`), or null for its
 * base picture. `talk` flaps the mouth like the hero; `wave` alternates two frames for a while; `point` holds.
 */
export function companionPoseAt(action: CompanionAction, t: number, available: readonly string[], talkTo = Infinity): 'talk' | 'wave1' | 'wave2' | 'point' | null {
  const has = (k: string) => available.includes(k);
  if (action === 'talk' && t > 0.3 && t < talkTo && has('talk') && mouthOpen(t)) return 'talk';
  if (action === 'wave' && t < WAVE_SECONDS && has('wave1') && has('wave2')) return Math.floor(t * 4) % 2 ? 'wave2' : 'wave1';
  if (action === 'point' && has('point')) return 'point';
  return null;
}
