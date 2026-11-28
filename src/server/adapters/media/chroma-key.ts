// Turns a picture painted on a flat chroma-key colour into a transparent PNG, in pure code (sharp only decodes and encodes).
// The background is found by flood fill from the picture's border, plus enclosed holes of almost exactly the key colour (the
// inside of a ring); small key-coloured details inside the subject stay. The edge is feathered and despilled.
import sharp from 'sharp';

import { UserFacingError } from '@/core/domain/errors';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface KeyOptions {
  /** Background colour; when absent it is measured from the picture's border (models rarely paint an exact #00FF00). */
  key?: Rgb;
  /** Distance to the key colour below which a border-connected pixel is background. */
  hard?: number;
  /** Distance above which an edge pixel is fully kept. */
  soft?: number;
}

export interface Keyed {
  data: Buffer;
  width: number;
  height: number;
}

/** Median colour of the pixels along the picture's border: the background the model actually painted. */
function borderColour(px: Uint8Array, w: number, h: number): Rgb {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(px[i]!);
    gs.push(px[i + 1]!);
    bs.push(px[i + 2]!);
  };
  for (let x = 0; x < w; x++) (take(x, 0), take(x, h - 1));
  for (let y = 1; y < h - 1; y++) (take(0, y), take(w - 1, y));
  const mid = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1]!;
  return { r: mid(rs), g: mid(gs), b: mid(bs) };
}

const dist = (d: Uint8Array, i: number, k: Rgb) => Math.hypot(d[i]! - k.r, d[i + 1]! - k.g, d[i + 2]! - k.b);

/** RGBA pixels with the background alpha set to 0 and the edge feathered. */
export async function keyOut(input: Buffer, opts: KeyOptions = {}): Promise<Keyed> {
  const hard = opts.hard ?? 80;
  const soft = opts.soft ?? 170;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8Array(data);
  const key = opts.key ?? borderColour(px, w, h);
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const p = y * w + x;
    if (!bg[p] && dist(px, p * 4, key) < hard) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) (seed(x, 0), seed(x, h - 1));
  for (let y = 0; y < h; y++) (seed(0, y), seed(w - 1, y));
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }
  // Holes: the backdrop seen through the subject (the inside of a ring, between the loops of a sash and the body,
  // between wheel spokes). Not connected to the border, so the fill above missed them, and the model often paints them
  // a lighter or shaded green. With a green key (the subject is asked to use no green), an enclosed, clearly green
  // region counts as a hole; otherwise only the key colour almost exactly. Tiny regions stay (a green detail on purpose).
  const greenKey = key.g > key.r && key.g > key.b;
  const tight = hard * 0.75;
  const keyLike = (p: number) => dist(px, p * 4, key) < tight;
  const greenish = (p: number) => greenKey && px[p * 4 + 1]! > px[p * 4]! + 40 && px[p * 4 + 1]! > px[p * 4 + 2]! + 40;
  const holeLike = (p: number) => keyLike(p) || greenish(p);
  const minHole = Math.max(200, Math.round(w * h * 0.0004));
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (bg[start] || seen[start] || !holeLike(start)) continue;
    const region: number[] = [start];
    seen[start] = 1;
    // A greenish band touching the outside background is spill on the subject's edge, not a hole: the feathering
    // below handles it. Only a region the subject encloses, or one of the key colour itself, is cleared.
    let touchesOutside = false;
    let allKey = true;
    for (let k = 0; k < region.length; k++) {
      const p = region[k]!;
      if (!keyLike(p)) allKey = false;
      const x = p % w;
      const y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0) continue;
        if (bg[q]) touchesOutside = true;
        else if (!seen[q] && holeLike(q)) {
          seen[q] = 1;
          region.push(q);
        }
      }
    }
    if (region.length >= minHole && (allKey || !touchesOutside)) for (const p of region) bg[p] = 1;
  }
  // Too little of the picture was background: the model did not paint a flat backdrop, so a cut-out would be garbage.
  let bgCount = 0;
  for (let p = 0; p < w * h; p++) bgCount += bg[p]!;
  if (bgCount < w * h * 0.1) throw new UserFacingError('Không tách được nền khỏi ảnh nhân vật (nền không phẳng một màu). Thử tạo lại biểu cảm này.');
  const out = Buffer.from(px);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (bg[p]) {
      out[i + 3] = 0;
      continue;
    }
    // Feather the pixels that touch the background (two rings), so the cut-out edge is not jagged.
    let near = false;
    const x = p % w;
    const y = (p - x) / w;
    for (let dy = -2; dy <= 2 && !near; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && bg[ny * w + nx]) {
          near = true;
          break;
        }
      }
    }
    if (!near) continue;
    const d = dist(px, i, key);
    out[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - hard) / (soft - hard))));
    if (greenKey) {
      const cap = Math.max(px[i]!, px[i + 2]!);
      if (px[i + 1]! > cap) out[i + 1] = cap;
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * Smallest box holding the picture's figure (alpha above `min`); null when the picture is empty. A row or column counts
 * only with a few opaque pixels in it, so stray specks the model leaves near the corners do not stretch the box.
 */
export function alphaBounds(k: Keyed, min = 16): { left: number; top: number; width: number; height: number } | null {
  const rows = new Uint32Array(k.height);
  const cols = new Uint32Array(k.width);
  for (let y = 0; y < k.height; y++) {
    for (let x = 0; x < k.width; x++) {
      if (k.data[(y * k.width + x) * 4 + 3]! > min) {
        rows[y]!++;
        cols[x]!++;
      }
    }
  }
  const need = (n: number) => Math.max(1, Math.min(3, Math.round(n * 0.004)));
  const first = (a: Uint32Array, n: number) => a.findIndex((v) => v >= n);
  const last = (a: Uint32Array, n: number) => a.length - 1 - [...a].reverse().findIndex((v) => v >= n);
  const y0 = first(rows, need(k.width));
  const x0 = first(cols, need(k.height));
  if (y0 < 0 || x0 < 0) return null;
  const y1 = last(rows, need(k.width));
  const x1 = last(cols, need(k.height));
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Top row of the character's body inside `box`: the first row as wide as half the figure's typical row. A raised hand
 * or fist is much narrower than the head, so it is skipped and the size of a waving sprite matches a standing one.
 */
export function bodyTop(k: Keyed, box: { left: number; top: number; width: number; height: number }, min = 16): number {
  const counts: number[] = [];
  for (let y = box.top; y < box.top + box.height; y++) {
    let n = 0;
    for (let x = box.left; x < box.left + box.width; x++) if (k.data[(y * k.width + x) * 4 + 3]! > min) n++;
    counts.push(n);
  }
  const typical = [...counts].sort((a, b) => a - b)[counts.length >> 1] ?? 0;
  const i = counts.findIndex((n) => n >= typical * 0.5);
  return box.top + Math.max(0, i);
}

/** Height of the body (feet to head, raised hands left out) of the figure in `box`. */
const bodyHeight = (k: Keyed, box: { left: number; top: number; width: number; height: number }) => box.top + box.height - bodyTop(k, box);

const MARGIN = 24;
const LONG_SIDE = 1000;
/** Room above the neutral figure (a share of its height) so a raised hand or a leap fits without shrinking the body. */
export const HEADROOM = 0.3;

/** The same canvas with headroom above the figure (for canvases made before headroom existed). */
export const withHeadroom = (c: SpriteCanvas): SpriteCanvas => ({ ...c, height: Math.max(c.height, Math.round(c.figure * (1 + HEADROOM)) + 2 * MARGIN) });

/** The transparent canvas every sprite of one character shares, and how tall the character stands on it in its neutral sprite. */
export interface SpriteCanvas {
  width: number;
  height: number;
  /** Height in canvas pixels of the character's body (feet to head, raised hands left out) in its neutral sprite; other sprites are sized from it. */
  figure: number;
}

/** The canvas of an existing sprite (its size, and the height of the figure on it). */
export async function canvasOf(png: Buffer): Promise<SpriteCanvas> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = { data, width: info.width, height: info.height };
  const box = alphaBounds(k);
  return { width: info.width, height: info.height, figure: box ? bodyHeight(k, box) : info.height - 2 * MARGIN };
}

/**
 * Places a cut-out (RGBA pixels) on the canvas, feet on the bottom edge and centred, the figure `ratio` times as tall as
 * the neutral one (a sitting pose is shorter, arms raised taller), shrunk only when it would not fit.
 */
async function place(keyed: Keyed, c: SpriteCanvas, ratio: number): Promise<Buffer> {
  const box = alphaBounds(keyed);
  if (!box) throw new Error('Không tìm thấy nhân vật trong ảnh (toàn ảnh là nền).');
  const s = Math.min((c.figure * ratio) / bodyHeight(keyed, box), (c.width - 2 * MARGIN) / box.width, (c.height - 2 * MARGIN) / box.height);
  const cut = await sharp(keyed.data, { raw: { width: keyed.width, height: keyed.height, channels: 4 } }).extract(box).resize(Math.max(1, Math.round(box.width * s)), Math.max(1, Math.round(box.height * s))).png().toBuffer();
  const meta = await sharp(cut).metadata();
  return sharp({ create: { width: c.width, height: c.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cut, left: Math.round((c.width - (meta.width ?? 0)) / 2), top: c.height - MARGIN - (meta.height ?? 0) }])
    .png()
    .toBuffer();
}

/**
 * Cuts the character out and places it on a transparent canvas, feet on the bottom edge and centred.
 * Without a canvas (the neutral sprite) the canvas is made tight around the character; pass it back in for the other
 * sprites so the character keeps its size whatever size the model drew it at.
 */
export async function toSprite(input: Buffer, canvas?: SpriteCanvas, opts?: KeyOptions, ratio = 1): Promise<{ png: Buffer; canvas: SpriteCanvas }> {
  const keyed = await keyOut(input, opts);
  const box = alphaBounds(keyed);
  if (!box) throw new Error('Không tìm thấy nhân vật trong ảnh (toàn ảnh là nền).');
  const own = Math.min(LONG_SIDE / box.width, LONG_SIDE / box.height);
  const figure = Math.round(bodyHeight(keyed, box) * own);
  const c: SpriteCanvas = canvas ?? { width: Math.round(box.width * own) + 2 * MARGIN, height: Math.max(Math.round(box.height * own), Math.round(figure * (1 + HEADROOM))) + 2 * MARGIN, figure };
  return { png: await place(keyed, c, canvas ? ratio : 1), canvas: c };
}

/** Re-places an already transparent sprite on a canvas (fixes the size of a sprite drawn at the wrong scale). */
export async function refitSprite(png: Buffer, canvas: SpriteCanvas, ratio = 1): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return place({ data, width: info.width, height: info.height }, canvas, ratio);
}

/** A logo or emblem painted on the key colour: cut out, trimmed and centred on a transparent square. */
export async function toMark(input: Buffer, size = 1024): Promise<Buffer> {
  const keyed = await keyOut(input);
  const box = alphaBounds(keyed);
  if (!box) throw new UserFacingError('AI vẽ ảnh không có hình nào. Thử đổi mô tả rồi vẽ lại.');
  const inner = size - 2 * MARGIN;
  const cut = await sharp(keyed.data, { raw: { width: keyed.width, height: keyed.height, channels: 4 } }).extract(box).resize(inner, inner, { fit: 'inside' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: cut, gravity: 'centre' }]).png().toBuffer();
}
