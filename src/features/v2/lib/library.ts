import type { ChannelView } from '@/features/channel/services/channel.api';
import type { SeriesView } from '@/features/series/services/series.api';

export interface LibraryState {
  /** Characters and props the series bibles list, and how many of them have a picture. */
  figures: number;
  drawn: number;
  /** The parts of the brand kit, each present or not, in the order shown. */
  parts: { key: 'logo' | 'avatar' | 'intro' | 'outro' | 'music'; label: string; done: boolean }[];
  /** Parts present out of parts + figures-all-drawn, for the progress bar. */
  done: number;
  total: number;
  complete: boolean;
}

/** What one project's library holds and lacks: its brand kit plus the characters of every series. */
export function libraryState(c: ChannelView, series: SeriesView[]): LibraryState {
  let figures = 0;
  let drawn = 0;
  for (const s of series) {
    const bible = s.rules.bible;
    const items = bible.library ?? [];
    figures += items.length;
    drawn += items.filter((i) => (i.kind === 'hero' ? bible.characterAssets.length > 0 : Boolean(bible.characterCast[i.id]))).length;
  }
  const parts: LibraryState['parts'] = [
    { key: 'logo', label: 'Logo', done: Boolean(c.logoUrl) },
    { key: 'avatar', label: 'Người dẫn', done: Boolean(c.avatarUrl) },
    { key: 'intro', label: 'Intro', done: Boolean(c.introDesign || c.introArtUrl) },
    { key: 'outro', label: 'Outro', done: Boolean(c.outroDesign || c.outroArtUrl) },
    { key: 'music', label: 'Nhạc nền', done: c.music !== 'none' },
  ];
  const charsDone = figures > 0 && drawn === figures;
  const done = parts.filter((p) => p.done).length + (charsDone ? 1 : 0);
  const total = parts.length + 1;
  return { figures, drawn, parts, done, total, complete: done === total };
}
