// Suggests market skills and scene types from what the channel says about itself (description, audience, style, name).
// Plain keyword scoring on purpose: instant, free, and good enough to put the likely picks first.

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

export interface Scored<T> {
  item: T;
  score: number;
  /** The words that matched, for "why this" hints. */
  because: string[];
}

/** What a channel says about itself, as one string to match against. */
export const channelContext = (c: { name?: string; description?: string; audience?: string; style?: string }): string => [c.name, c.description, c.audience, c.style].filter(Boolean).join(' ');

function score(context: string, text: string, tags: string[] = []): { score: number; because: string[] } {
  const ctx = new Set(words(context));
  const body = new Set(words(text));
  const tagWords = new Set(tags.flatMap(words));
  const because: string[] = [];
  let s = 0;
  for (const w of ctx) {
    if (tagWords.has(w)) {
      s += 3;
      because.push(w);
    } else if (body.has(w)) {
      s += 1;
      because.push(w);
    }
  }
  return { score: s, because: because.slice(0, 4) };
}

export function recommendSkills<T extends { name: string; description: string; tags: string[] }>(skills: T[], context: string): Scored<T>[] {
  return skills.map((item) => ({ item, ...score(context, `${item.name} ${item.description}`, item.tags) })).sort((a, b) => b.score - a.score);
}

/** Subjects each scene type suits, beyond its own wording (accents optional). */
const BLOCK_TOPICS: Record<string, string> = {
  'remotion/ui': 'phan mem ung dung app cong nghe ai may tinh digital tool cong cu website startup huong dan thao tac',
  'remotion/counter': 'so lieu thong ke tai chinh kinh te gia tien dan so khoa hoc ky luc',
  'remotion/chart': 'so lieu thong ke so sanh xu huong tang giam kinh te tai chinh thi truong',
  'remotion/timeline': 'lich su su kien tieu su hanh trinh nien dai cong nghe phat trien',
  'remotion/gauge': 'chi so do luong muc do nguy hiem suc khoe nhiet do toc do',
  'remotion/dots': 'ti le phan tram dan so khao sat nguoi dan xa hoi',
  'remotion/kinetic': 'cau hoi nhan dinh trich dan loi khuyen meo',
  'remotion/vox': 'dieu tra giai thich tai lieu bi an lich su khoa hoc chinh tri',
  'remotion/picture': 'ke chuyen du lich am thuc tieu su tin tuc',
  'remotion/cards': 'tre em thieu nhi hoc dem so chu cai mau sac con vat',
  'remotion/whiteboard': 'giai thich quy trinh vong doi tung buoc thieu nhi',
};

export function recommendBlocks<T extends { ref: string; name: string; summary: string }>(blocks: T[], context: string): Scored<T>[] {
  return blocks.map((item) => ({ item, ...score(context, `${item.name} ${item.summary} ${BLOCK_TOPICS[item.ref] ?? ''}`) })).sort((a, b) => b.score - a.score);
}

/** Case- and accent-insensitive "all words appear" search. */
export const matches = (query: string, ...texts: string[]): boolean => {
  const ws = fold(query).split(/\s+/).filter(Boolean);
  const hay = fold(texts.join(' '));
  return ws.every((w) => hay.includes(w));
};
