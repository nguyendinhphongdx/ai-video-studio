// Sprite generation with a fake picture model: no paid call, the "model" paints a character on a green background.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/adapters/image/image.service', () => ({ images: { isReady: async () => true, generate: async () => {} } }));
vi.mock('@/server/modules/job/job.repository', () => ({ jobRepository: { insert: () => ({}) } }));

import { alphaBounds, keyOut, refitSprite, toSprite } from '@/server/adapters/media/chroma-key';
import type { ImagePort } from '@/core/ports';
import { generateSprites, spriteCount } from '@/server/modules/series/character-sprites.service';

/** 160x240 green picture with a red body (60x120 at an offset) and a small green "gem" inside it. */
async function paint(bodyW = 60, bodyH = 120, x = 50, y = 70): Promise<Buffer> {
  const body = await sharp({ create: { width: bodyW, height: bodyH, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
  const gem = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer();
  return sharp({ create: { width: 160, height: 240, channels: 3, background: { r: 0, g: 255, b: 0 } } })
    .composite([{ input: body, left: x, top: y }, { input: gem, left: x + 20, top: y + 40 }])
    .png()
    .toBuffer();
}

/** Decoded RGBA of a finished sprite (no keying). */
async function decode(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const alphaAt = (k: { data: Buffer; width: number }, x: number, y: number) => k.data[(y * k.width + x) * 4 + 3]!;

describe('chroma key', () => {
  it('clears the background, keeps the body and the key-coloured pixels enclosed by it', async () => {
    const k = await keyOut(await paint());
    expect(alphaAt(k, 0, 0)).toBe(0);
    expect(alphaAt(k, 159, 239)).toBe(0);
    expect(alphaAt(k, 80, 130)).toBe(255);
    expect(alphaAt(k, 50 + 22, 70 + 42)).toBe(255); // the enclosed green gem
  });

  it('clears a hole of backdrop seen through the subject (the inside of a ring), not just the outside', async () => {
    // A red "ring": a 60x60 body with a 30x30 window of pure backdrop green in the middle.
    const ring = await sharp({ create: { width: 60, height: 60, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const hole = await sharp({ create: { width: 30, height: 30, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer();
    const img = await sharp({ create: { width: 160, height: 240, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .composite([{ input: ring, left: 50, top: 90 }, { input: hole, left: 65, top: 105 }])
      .png()
      .toBuffer();
    const k = await keyOut(img);
    expect(alphaAt(k, 80, 120)).toBe(0); // the middle of the hole
    expect(alphaAt(k, 52, 92)).toBe(255); // the ring itself
  });

  it('also clears a hole the model painted a lighter green than the backdrop', async () => {
    const ring = await sharp({ create: { width: 60, height: 60, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const hole = await sharp({ create: { width: 30, height: 30, channels: 3, background: { r: 150, g: 215, b: 120 } } }).png().toBuffer();
    const img = await sharp({ create: { width: 160, height: 240, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .composite([{ input: ring, left: 50, top: 90 }, { input: hole, left: 65, top: 105 }])
      .png()
      .toBuffer();
    const k = await keyOut(img);
    expect(alphaAt(k, 80, 120)).toBe(0);
    expect(alphaAt(k, 52, 92)).toBe(255);
  });

  it('feathers the edge and removes green spill', async () => {
    // A green-tinted rim (between key and body colour) around the body.
    const rim = await sharp({ create: { width: 64, height: 124, channels: 3, background: { r: 100, g: 200, b: 60 } } }).png().toBuffer();
    const body = await sharp({ create: { width: 60, height: 120, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const img = await sharp({ create: { width: 160, height: 240, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .composite([{ input: rim, left: 48, top: 68 }, { input: body, left: 50, top: 70 }])
      .png()
      .toBuffer();
    const k = await keyOut(img);
    const i = (68 * k.width + 80) * 4; // on the rim, touching the background
    expect(k.data[i + 3]).toBeGreaterThan(0);
    expect(k.data[i + 3]).toBeLessThan(255);
    expect(k.data[i + 1]).toBeLessThanOrEqual(100); // green capped to the larger of red and blue
    expect(alphaAt(k, 80, 130)).toBe(255);
  });

  it('puts the character feet-down and centred on a canvas tight around it, same size across expressions', async () => {
    const a = await toSprite(await paint());
    const dec = await decode(a.png);
    expect([dec.width, dec.height]).toEqual([a.canvas.width, a.canvas.height]);
    const box = alphaBounds(dec)!;
    expect(box.top + box.height).toBeGreaterThan(dec.height - 40); // feet near the bottom edge
    expect(Math.abs(box.left + box.width / 2 - dec.width / 2)).toBeLessThan(3);
    // A slightly smaller expression keeps the neutral's canvas and scale; one that would not fit is shrunk to fit.
    const smaller = await toSprite(await paint(54, 110, 50, 70), a.canvas);
    expect(smaller.canvas).toEqual(a.canvas);
    const bigger = await toSprite(await paint(60, 150, 50, 40), a.canvas);
    expect(alphaBounds(await decode(bigger.png))!.height).toBeLessThanOrEqual(a.canvas.height);
  });

  it('sizes a sprite from the neutral figure, whatever size the model drew it, and by pose', async () => {
    const a = await toSprite(await paint());
    const tiny = await toSprite(await paint(30, 60, 60, 100), a.canvas);
    const h = async (png: Buffer) => alphaBounds(await decode(png))!.height;
    expect(Math.abs((await h(tiny.png)) - a.canvas.figure)).toBeLessThan(3);
    const sit = await toSprite(await paint(30, 60, 60, 100), a.canvas, undefined, 0.68);
    expect(Math.abs((await h(sit.png)) - a.canvas.figure * 0.68)).toBeLessThan(3);
    expect(Math.abs((await h(await refitSprite(tiny.png, a.canvas, 0.5))) - a.canvas.figure * 0.5)).toBeLessThan(3);
  });

  it('leaves a raised hand out of the body height, so a waving sprite keeps the standing size', async () => {
    // A body 60 wide x 120 tall, then the same body with a thin "hand" 8 px wide raised 30 px above it (a quarter of its height).
    const body = await sharp({ create: { width: 60, height: 120, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const hand = await sharp({ create: { width: 8, height: 30, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const green = { r: 0, g: 255, b: 0 };
    const stand = await sharp({ create: { width: 200, height: 260, channels: 3, background: green } }).composite([{ input: body, left: 70, top: 110 }]).png().toBuffer();
    const wave = await sharp({ create: { width: 200, height: 260, channels: 3, background: green } }).composite([{ input: body, left: 70, top: 110 }, { input: hand, left: 120, top: 80 }]).png().toBuffer();
    const a = await toSprite(stand);
    const b = await toSprite(wave, a.canvas);
    const width = async (png: Buffer) => alphaBounds(await decode(png))!.width;
    // Same body width means the same scale: the hand did not shrink the waving figure.
    expect(Math.abs((await width(b.png)) - (await width(a.png)))).toBeLessThan(4);
  });

  it('finds the background colour by itself when the model paints a muted green, not pure #00FF00', async () => {
    const bgc = { r: 160, g: 205, b: 120 };
    const body = await sharp({ create: { width: 60, height: 120, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    const img = await sharp({ create: { width: 160, height: 240, channels: 3, background: bgc } }).composite([{ input: body, left: 50, top: 70 }]).png().toBuffer();
    const k = await keyOut(img);
    expect(alphaAt(k, 3, 3)).toBe(0);
    expect(alphaAt(k, 80, 130)).toBe(255);
    const { png } = await toSprite(img);
    const dec = await decode(png);
    expect(dec.width).toBeLessThan(700); // a canvas tight around the body, not the whole picture
  });

  it('refuses a picture without a flat background instead of saving it opaque', async () => {
    const noisy = Buffer.alloc(40 * 40 * 3);
    for (let i = 0; i < noisy.length; i++) noisy[i] = (i * 97) % 256;
    await expect(keyOut(await sharp(noisy, { raw: { width: 40, height: 40, channels: 3 } }).png().toBuffer())).rejects.toThrow(/Không tách được nền/);
  });

  it('refuses a picture that is all background', async () => {
    const empty = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer();
    await expect(toSprite(empty)).rejects.toThrow(/Không tìm thấy nhân vật/);
  });
});

describe('generateSprites', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-sprite-test-'));
    await fs.writeFile(path.join(dir, 'ref.png'), await paint());
  });
  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  const deps = (calls: { prompt: string; refs: string[] }[]) => {
    let n = 0;
    const fake: ImagePort = {
      isReady: async () => true,
      generate: async (prompt, out, _meta, refs = []) => {
        calls.push({ prompt, refs });
        await fs.writeFile(out, await paint());
      },
    };
    return {
      images: fake,
      resolve: (rel: string) => path.join(dir, rel),
      save: async (png: Buffer) => {
        const rel = `sprite-${n++}.png`;
        await fs.writeFile(path.join(dir, rel), png);
        return rel;
      },
    };
  };

  it('makes every missing expression, neutral first, keeping the same character via the references', async () => {
    const calls: { prompt: string; refs: string[] }[] = [];
    const made = await generateSprites({ reference: 'ref.png', existing: {} }, deps(calls));
    expect(Object.keys(made)).toEqual(['neutral', 'talk', 'blink', 'happy', 'angry', 'sad', 'surprised']);
    expect(calls).toHaveLength(7);
    expect(calls[0]!.refs).toEqual([path.join(dir, 'ref.png')]);
    expect(calls[1]!.refs).toEqual([path.join(dir, 'ref.png'), path.join(dir, made.neutral!)]);
    for (const rel of Object.values(made)) expect((await sharp(path.join(dir, rel)).metadata()).hasAlpha).toBe(true);
  });

  it('skips expressions the series already has and uses its neutral sprite as a reference', async () => {
    const calls: { prompt: string; refs: string[] }[] = [];
    await fs.writeFile(path.join(dir, 'have.png'), await toSprite(await paint()).then((s) => s.png));
    const made = await generateSprites({ reference: 'ref.png', existing: { neutral: 'have.png', talk: 'have.png' }, expressions: ['neutral', 'talk', 'happy'] }, deps(calls));
    expect(Object.keys(made)).toEqual(['happy']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.refs).toContain(path.join(dir, 'have.png'));
    expect(spriteCount({ existing: { neutral: 'x' }, expressions: ['neutral', 'happy'] })).toBe(1);
  });

  it('draws the series own poses from their descriptions, after neutral', async () => {
    const calls: { prompt: string; refs: string[] }[] = [];
    const made = await generateSprites({ reference: 'ref.png', existing: {}, custom: [{ key: 'pose:mua-thuong', prompt: 'spinning a red-tasselled spear above the head' }] }, deps(calls));
    expect(Object.keys(made)).toEqual(['neutral', 'pose:mua-thuong']);
    expect(calls[1]!.prompt).toContain('spinning a red-tasselled spear');
    expect(calls[1]!.prompt).toContain('what the pose says the character holds');
  });

  it('draws a supporting character pose from its own picture only, never a neutral or a hero pose', async () => {
    const calls: { prompt: string; refs: string[] }[] = [];
    const made = await generateSprites({ reference: 'ref.png', existing: {}, target: 'cast', expressions: ['talk', 'walk1', 'wave1'] }, deps(calls));
    expect(Object.keys(made)).toEqual(['talk', 'wave1']);
    for (const c of calls) expect(c.refs).toEqual([path.join(dir, 'ref.png')]);
    expect(spriteCount({ existing: { talk: 'x' }, target: 'cast', expressions: ['talk', 'point'] })).toBe(1);
  });

  it('fails clearly when the reference picture is gone, without calling the model', async () => {
    const calls: { prompt: string; refs: string[] }[] = [];
    await expect(generateSprites({ reference: 'missing.png', existing: {} }, deps(calls))).rejects.toThrow(/ảnh chuẩn/);
    expect(calls).toHaveLength(0);
  });
});
