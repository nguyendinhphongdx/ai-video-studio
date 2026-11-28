// One list of characters over the two places their pictures are stored: the old hero's (`characterSprites`,
// `characterAssets`) and everyone else's (`characterCast`). `bible.roster` adds what pictures cannot say.
// Every edit returns a new bible; the screen and the assistant both save through these.
import { UserFacingError } from '../domain/errors';
import type { SeriesBible } from '../domain/series';
import { CAST_POSES, customPoseKey, EXPRESSIONS, POSE_ID, POSES } from './expressions';

export interface RosterEntry {
  name?: string;
  description?: string;
  /** The story centres on them; says nothing about what they can do. */
  main?: boolean;
  kind?: 'character' | 'prop';
  /** A prop that belongs to one character; without it the prop is shared. */
  owner?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  main: boolean;
  kind: 'character' | 'prop';
  owner: string | null;
  /** The series' first character, whose pictures have their own place (more actions, several reference pictures). */
  hero: boolean;
  references: string[];
  /** Slot keys; `neutral` is the plain picture. */
  expressions: string[];
  actions: string[];
  /** Slot key to media path, only what is drawn. */
  pictures: Record<string, string>;
}

export const heroIdOf = (bible: SeriesBible) => bible.library?.find((x) => x.kind === 'hero')?.id ?? 'hero';

const CAST_ACTIONS = CAST_POSES.filter((k) => /^(wave|point)/.test(k)) as string[];
const CAST_FACES = ['neutral', ...CAST_POSES.filter((k) => !CAST_ACTIONS.includes(k))];

export function charactersOf(bible: SeriesBible): Character[] {
  const roster = bible.roster ?? {};
  const planned = new Map((bible.library ?? []).map((x) => [x.id, x]));
  const heroId = heroIdOf(bible);
  const ids = [heroId, ...new Set([...planned.keys(), ...Object.keys(bible.characterCast ?? {}).filter((k) => !k.includes(':')), ...Object.keys(roster)])].filter((id, i, all) => all.indexOf(id) === i);
  const kindOf = (id: string): Character['kind'] => (id === heroId ? 'character' : roster[id]?.kind ?? (planned.get(id)?.kind === 'item' ? 'prop' : 'character'));
  return ids.map((id): Character => {
    const meta = roster[id] ?? {};
    const hero = id === heroId;
    const kind = kindOf(id);
    const custom = hero ? Object.keys(bible.customPoses ?? {}).map(customPoseKey) : [];
    const expressions = hero ? [...EXPRESSIONS] : kind === 'prop' ? ['neutral'] : CAST_FACES;
    const actions = hero ? [...POSES, ...custom] : kind === 'prop' ? [] : CAST_ACTIONS;
    const pictures: Record<string, string> = {};
    for (const key of [...expressions, ...actions]) {
      const path = hero ? bible.characterSprites?.[key] : bible.characterCast?.[key === 'neutral' ? id : `${id}:${key}`];
      if (path) pictures[key] = path;
    }
    const owner = kind === 'prop' && meta.owner && meta.owner !== id && ids.includes(meta.owner) && kindOf(meta.owner) === 'character' ? meta.owner : null;
    return {
      id,
      name: meta.name || planned.get(id)?.name || (hero ? 'Nhân vật chính' : id),
      description: meta.description ?? planned.get(id)?.description ?? '',
      main: meta.main ?? hero,
      kind,
      owner,
      hero,
      references: hero ? bible.characterAssets : [],
      expressions: [...expressions],
      actions,
      pictures,
    };
  });
}

export function findCharacter(bible: SeriesBible, id: string): Character {
  const c = charactersOf(bible).find((x) => x.id === id);
  if (!c) throw new UserFacingError(`Series không có nhân vật "${id}".`);
  return c;
}

/** Adds a character (or prop) that has no picture yet, or changes what is known about one. */
export function saveCharacter(bible: SeriesBible, id: string, patch: Partial<Omit<RosterEntry, 'owner'>> & { owner?: string | null }): SeriesBible {
  if (!POSE_ID.test(id)) throw new UserFacingError('Id chỉ gồm chữ thường không dấu, số và dấu gạch, tối đa 24 ký tự.');
  const all = charactersOf(bible);
  const old = all.find((c) => c.id === id);
  const kind = old?.hero ? 'character' : (patch.kind ?? old?.kind ?? 'character');
  if (patch.owner) {
    const owner = all.find((c) => c.id === patch.owner);
    if (kind !== 'prop') throw new UserFacingError('Chỉ đạo cụ mới có chủ.');
    if (owner?.kind !== 'character') throw new UserFacingError(`Không có nhân vật "${patch.owner}" để làm chủ.`);
  }
  const { owner, ...rest } = patch;
  const next: RosterEntry = { ...bible.roster?.[id], ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)), kind };
  if (owner === null || kind !== 'prop') delete next.owner;
  else if (owner) next.owner = owner;
  return { ...bible, roster: { ...bible.roster, [id]: next } };
}

export function removeCharacter(bible: SeriesBible, id: string): SeriesBible {
  const c = findCharacter(bible, id);
  if (c.hero) throw new UserFacingError('Chưa xoá được nhân vật chính đầu tiên của series. Bạn vẫn đổi được ảnh và mô tả của họ.');
  const roster = Object.fromEntries(
    Object.entries(bible.roster ?? {})
      .filter(([k]) => k !== id)
      // Their accessories stay, as shared props.
      .map(([k, v]) => [k, v.owner === id ? { ...v, owner: undefined } : v]),
  );
  return {
    ...bible,
    roster,
    ...(bible.library ? { library: bible.library.filter((x) => x.id !== id) } : {}),
    characterCast: Object.fromEntries(Object.entries(bible.characterCast).filter(([k]) => k !== id && !k.startsWith(`${id}:`))),
  };
}

/** Sets or (with null) takes away one picture. */
export function setPicture(bible: SeriesBible, id: string, key: string, path: string | null): SeriesBible {
  const c = findCharacter(bible, id);
  if (![...c.expressions, ...c.actions].includes(key)) throw new UserFacingError(`${c.name} không có ô ảnh "${key}".`);
  const field = c.hero ? 'characterSprites' : 'characterCast';
  const at = c.hero ? key : key === 'neutral' ? id : `${id}:${key}`;
  const map = { ...bible[field] };
  if (path) map[at] = path;
  else delete map[at];
  // A character that only exists as its plain picture must not vanish with it.
  const keep = !path && !c.hero && key === 'neutral' ? saveCharacter(bible, id, {}).roster : bible.roster;
  return { ...bible, [field]: map, ...(keep ? { roster: keep } : {}) };
}

/** The slots still without a picture, the plain one first: every other picture is drawn from it. */
export function missingPictures(c: Character, wanted?: string[]): string[] {
  const all = [...c.expressions, ...c.actions];
  const todo = (wanted ?? all).filter((k) => all.includes(k) && !c.pictures[k] && k !== 'neutral');
  const plain = !c.pictures.neutral && (todo.length > 0 || (wanted ?? all).includes('neutral'));
  return plain ? ['neutral', ...todo] : todo;
}
