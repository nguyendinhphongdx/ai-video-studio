import { describe, expect, it } from 'vitest';

import type { ChannelView } from '@/features/channel/services/channel.api';
import type { SeriesView } from '@/features/series/services/series.api';
import { libraryState } from '@/features/v2/lib/library';

const channel = (o: Partial<ChannelView> = {}) => ({ logoUrl: null, avatarUrl: null, introDesign: null, outroDesign: null, introArtUrl: null, outroArtUrl: null, music: 'none', ...o }) as unknown as ChannelView;
const series = (library: { id: string; kind: string }[], characterAssets: string[] = [], characterCast: Record<string, string> = {}) => ({ rules: { bible: { library, characterAssets, characterCast } } }) as unknown as SeriesView;

describe('libraryState', () => {
  it('counts brand parts and drawn figures across series', () => {
    const s = libraryState(channel({ logoUrl: 'x', music: 'a.wav', introArtUrl: 'i' }), [series([{ id: 'h', kind: 'hero' }, { id: 'k', kind: 'prop' }], ['a'], {}), series([{ id: 'p', kind: 'prop' }], [], { p: 'img' })]);
    expect(s.figures).toBe(3);
    expect(s.drawn).toBe(2);
    expect(s.parts.filter((p) => p.done).map((p) => p.key)).toEqual(['logo', 'intro', 'music']);
    expect(s.done).toBe(3);
    expect(s.complete).toBe(false);
  });
  it('is complete only when every part is there and every figure is drawn', () => {
    const full = channel({ logoUrl: 'x', avatarUrl: 'x', introArtUrl: 'x', outroArtUrl: 'x', music: 'a.wav' });
    expect(libraryState(full, [series([{ id: 'h', kind: 'hero' }], ['a'])]).complete).toBe(true);
    expect(libraryState(full, []).complete).toBe(false);
  });
});
