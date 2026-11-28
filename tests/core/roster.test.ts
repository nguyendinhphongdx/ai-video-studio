import { describe, expect, it } from 'vitest';

import { charactersOf, missingPictures, removeCharacter, saveCharacter, setPicture } from '@/core/character/roster';
import type { SeriesBible } from '@/core/domain/series';

const old: SeriesBible = {
  premise: '', instructions: '', host: '', catchphrases: [], avoid: [], characters: '',
  characterAssets: ['ref.png'],
  characterSprites: { neutral: 'n.png', 'pose:mua-thuong': 'm.png' },
  customPoses: { 'mua-thuong': 'spinning a spear' },
  characterCast: { 'ly-tinh': 'l.png', 'ly-tinh:happy': 'lh.png', vong: 'v.png' },
  library: [
    { id: 'na-tra', kind: 'hero', name: 'Na Tra', description: 'bé trai áo đỏ' },
    { id: 'vong', kind: 'item', name: 'Vòng Càn Khôn', description: 'a golden ring' },
  ],
};

describe('roster', () => {
  it('reads old series data as one list', () => {
    const list = charactersOf(old);
    expect(list.map((c) => [c.id, c.kind, c.main, c.owner])).toEqual([['na-tra', 'character', true, null], ['vong', 'prop', false, null], ['ly-tinh', 'character', false, null]]);
    expect(list[0]!.pictures).toEqual({ neutral: 'n.png', 'pose:mua-thuong': 'm.png' });
    expect(list[2]!.pictures).toEqual({ neutral: 'l.png', happy: 'lh.png' });
  });

  it('gives a prop an owner and frees it when the owner goes', () => {
    const owned = saveCharacter(old, 'vong', { owner: 'ly-tinh' });
    expect(charactersOf(owned).find((c) => c.id === 'vong')!.owner).toBe('ly-tinh');
    const gone = removeCharacter(owned, 'ly-tinh');
    expect(charactersOf(gone).map((c) => [c.id, c.owner])).toEqual([['na-tra', null], ['vong', null]]);
    expect(Object.keys(gone.characterCast)).toEqual(['vong']);
    expect(() => saveCharacter(old, 'ly-tinh', { owner: 'na-tra' })).toThrow(/đạo cụ/);
    expect(() => removeCharacter(old, 'na-tra')).toThrow();
  });

  it('keeps a new character without pictures and asks for the plain one first', () => {
    const next = saveCharacter(old, 'thai-at', { name: 'Thái Ất', description: 'old sage' });
    const c = charactersOf(next).find((x) => x.id === 'thai-at')!;
    expect(missingPictures(c, ['happy'])).toEqual(['neutral', 'happy']);
    const drawn = setPicture(next, 'thai-at', 'neutral', 't.png');
    expect(drawn.characterCast['thai-at']).toBe('t.png');
    expect(charactersOf(setPicture(drawn, 'thai-at', 'neutral', null)).some((x) => x.id === 'thai-at')).toBe(true);
    expect(() => setPicture(next, 'thai-at', 'walk1', 'w.png')).toThrow();
  });
});
