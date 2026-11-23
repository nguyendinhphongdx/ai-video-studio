// Turns a picture painted on a flat chroma-key colour into a transparent PNG, in pure code (sharp only decodes and encodes).
// The background is found by flood fill from the picture's border, so pixels of the key colour that sit inside the
// character (a green gem, say) stay; the edge is feathered and despilled so no coloured halo is left around the body.
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
  // Too little of the picture was background: the model did not paint a flat backdrop, so a cut-out would be garbage.
  let bgCount = 0;
  for (let p = 0; p < w * h; p++) bgCount += bg[p]!;
  if (bgCount < w * h * 0.1) throw new UserFacingError('Không tách được nền khỏi ảnh nhân vật (nền không phẳng một màu). Thử tạo lại biểu cảm này.');
  const greenKey = key.g > key.r && key.g > key.b;
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

/** Smallest box holding every pixel with alpha above `min`; null when the picture is empty. */
export function alphaBounds(k: Keyed, min = 16): { left: number; top: number; width: number; height: number } | null {
  let x0 = k.width;
  let y0 = k.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < k.height; y++) {
    for (let x = 0; x < k.width; x++) {
      if (k.data[(y * k.width + x) * 4 + 3]! > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const MARGIN = 24;
const LONG_SIDE = 1000;

/** Size of the transparent canvas and the scale every expression of one character is drawn at (taken from its neutral sprite). */
export interface SpriteCanvas {
  width: number;
  height: number;
  scale: number;
}

/**
 * Cuts the character out and places it on a transparent canvas, feet on the bottom edge and centred.
 * The first sprite (neutral) decides the canvas, tight around the character; pass it back in for the other expressions
 * so they all keep the same size and the head does not jump between sprites.
 */
export async function toSprite(input: Buffer, canvas?: SpriteCanvas, opts?: KeyOptions): Promise<{ png: Buffer; canvas: SpriteCanvas }> {
  const keyed = await keyOut(input, opts);
  const box = alphaBounds(keyed);
  if (!box) throw new Error('Không tìm thấy nhân vật trong ảnh (toàn ảnh là nền).');
  const own = Math.min(LONG_SIDE / box.width, LONG_SIDE / box.height);
  const c: SpriteCanvas = canvas ?? { scale: own, width: Math.round(box.width * own) + 2 * MARGIN, height: Math.round(box.height * own) + 2 * MARGIN };
  // Keep the neutral's scale; shrink only when this expression would not fit the canvas.
  const s = Math.min(c.scale, (c.width - 2 * MARGIN) / box.width, (c.height - 2 * MARGIN) / box.height);
  const cut = await sharp(keyed.data, { raw: { width: keyed.width, height: keyed.height, channels: 4 } }).extract(box).resize(Math.max(1, Math.round(box.width * s)), Math.max(1, Math.round(box.height * s))).png().toBuffer();
  const meta = await sharp(cut).metadata();
  const png = await sharp({ create: { width: c.width, height: c.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cut, left: Math.round((c.width - (meta.width ?? 0)) / 2), top: c.height - MARGIN - (meta.height ?? 0) }])
    .png()
    .toBuffer();
  return { png, canvas: c };
}
