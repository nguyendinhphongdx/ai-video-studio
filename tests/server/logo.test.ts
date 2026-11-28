// A drawn logo is cut off its green backdrop and sits centred on a transparent square.
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { toMark } from '@/server/adapters/media/chroma-key';

describe('toMark', () => {
  it('returns a transparent square with the mark in the middle', async () => {
    const mark = await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 200, g: 30, b: 30 } } }).png().toBuffer();
    const painted = await sharp({ create: { width: 160, height: 90, channels: 3, background: { r: 0, g: 255, b: 0 } } }).composite([{ input: mark, left: 10, top: 10 }]).png().toBuffer();
    const { data, info } = await sharp(await toMark(painted, 256)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect([info.width, info.height]).toEqual([256, 256]);
    expect(alpha(2, 2)).toBe(0);
    expect(alpha(128, 128)).toBe(255);
  });
});
