import { db } from '@/server/db';
import { ctx } from '@/server/context';

type Row = Record<string, unknown>;

/** System-wide values (the worker heartbeat), the same for every workspace. */
const getSystem = (key: string): string | null => {
  const r = db().prepare('SELECT value FROM app_prefs WHERE key = ?').get(key) as Row | undefined;
  return r ? String(r.value) : null;
};
const setSystem = (key: string, value: string) => {
  db().prepare('INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
};

/** The current workspace's own switches. */
const get = (key: string): string | null => {
  const r = db().prepare('SELECT value FROM workspace_prefs WHERE workspace_id = ? AND key = ?').get(ctx().workspaceId, key) as Row | undefined;
  return r ? String(r.value) : null;
};
const set = (key: string, value: string) => {
  db().prepare('INSERT INTO workspace_prefs (workspace_id, key, value, user_id) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id, key) DO UPDATE SET value = excluded.value, user_id = excluded.user_id').run(ctx().workspaceId, key, value, ctx().userId);
};

export interface SfxPrefs {
  enabled: boolean;
  /** 0-1 master level. */
  volume: number;
}

/** Small switches that are not part of any channel or video: per workspace, except the worker heartbeat. */
export const prefsService = {
  /** The worker calls this every few seconds; the web app reads it to tell whether background work is being picked up. */
  workerBeat: (): void => setSystem('worker_seen_at', String(Date.now())),
  workerSeenAt: (): number | null => {
    const v = Number(getSystem('worker_seen_at'));
    return Number.isFinite(v) && getSystem('worker_seen_at') !== null ? v : null;
  },

  /** One-time markers ("this was done once"), so a thing a person later undoes is not redone. */
  flag: (key: string): boolean => get(`flag:${key}`) === '1',
  setFlag: (key: string): void => set(`flag:${key}`, '1'),

  /** The first-run guide on the home screen: dismissed for good once a person closes it. */
  onboardingDismissed: (): boolean => get('onboarding_dismissed') === '1',
  setOnboardingDismissed: (dismissed: boolean): boolean => {
    set('onboarding_dismissed', dismissed ? '1' : '0');
    return dismissed;
  },

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
