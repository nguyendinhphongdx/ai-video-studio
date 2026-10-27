import { db } from '@/server/db';

type Row = Record<string, unknown>;

const get = (key: string): string | null => {
  const r = db().prepare('SELECT value FROM app_prefs WHERE key = ?').get(key) as Row | undefined;
  return r ? String(r.value) : null;
};
const set = (key: string, value: string) => {
  db().prepare('INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
};

export interface SfxPrefs {
  enabled: boolean;
  /** 0-1 master level. */
  volume: number;
}

/** Small app-wide switches that are not part of any channel or video. */
export const prefsService = {
  /** One-time markers ("this was done once"), so a thing a person later undoes is not redone. */
  flag: (key: string): boolean => get(`flag:${key}`) === '1',
  setFlag: (key: string): void => set(`flag:${key}`, '1'),

  async sfxEnabled(): Promise<boolean> {
    return get('sfx_enabled') !== '0';
  },
  async sfxVolume(): Promise<number> {
    const v = Number(get('sfx_volume'));
    return Number.isFinite(v) && get('sfx_volume') !== null ? Math.min(1, Math.max(0, v)) : 0.8;
  },
  async sfx(): Promise<SfxPrefs> {
    return { enabled: await prefsService.sfxEnabled(), volume: await prefsService.sfxVolume() };
  },
  async saveSfx(input: Partial<SfxPrefs>): Promise<SfxPrefs> {
    if (input.enabled !== undefined) set('sfx_enabled', input.enabled ? '1' : '0');
    if (input.volume !== undefined) set('sfx_volume', String(Math.min(1, Math.max(0, input.volume))));
    return prefsService.sfx();
  },
};
