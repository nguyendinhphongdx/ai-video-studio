// Drawing the missing pictures of one character: what is paid for, and that finished pictures survive a failure.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { charactersOf } from '@/core/character/roster';
import type { SeriesBible } from '@/core/domain/series';
import { drawPictures } from '@/server/modules/series/character.service';

const bible: SeriesBible = {
  premise: '', instructions: '', host: '', catchphrases: [], avoid: [], characters: '', characterAssets: [], characterSprites: {}, characterCast: {},
  roster: { 'thai-at': { name: 'Thái Ất', description: 'old sage with a white beard' } },
};

describe('drawPictures', () => {
  it('draws the first picture from the description and keeps it when a later one fails', async () => {
    const sharp = (await import('sharp')).default;
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .composite([{ input: await sharp({ create: { width: 20, height: 40, channels: 3, background: { r: 200, g: 30, b: 30 } } }).png().toBuffer(), left: 22, top: 12 }])
      .png()
      .toBuffer();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-draw-test-'));
    const calls: string[] = [];
    let saved = 0;
    const kept: Record<string, string>[] = [];
    const thaiAt = charactersOf(bible).find((c) => c.id === 'thai-at')!;
    const run = drawPictures(bible, thaiAt, ['happy'], 'storybook', {
      images: { isReady: async () => true, generate: async (prompt, out) => { calls.push(prompt); if (calls.length === 2) throw new Error('quota'); await fs.writeFile(out, png); } },
      save: async (data) => { const rel = `${++saved}.png`; await fs.writeFile(path.join(dir, rel), data); return rel; },
      resolve: (rel) => path.join(dir, rel),
    }, async (made) => void kept.push(made));
    await expect(run).rejects.toThrow('quota');
    expect(calls[0]).toContain('old sage with a white beard');
    expect(kept).toEqual([{ neutral: '1.png' }]);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
