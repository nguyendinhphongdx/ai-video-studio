import { and, eq } from 'drizzle-orm';

import { one, orm, owner, scoped } from '@/server/orm';
import { appPrefs, workspacePrefs } from '@/server/schema';

/** System-wide values (the worker heartbeat), the same for every workspace. */
const getSystem = async (key: string): Promise<string | null> => {
  const r = await orm().select({ value: appPrefs.value }).from(appPrefs).where(eq(appPrefs.key, key)).then(one);
  return r?.value ?? null;
};
const setSystem = async (key: string, value: string) => {
  await orm().insert(appPrefs).values({ key, value }).onConflictDoUpdate({ target: appPrefs.key, set: { value } });
};

/** The current workspace's own switches. */
const get = async (key: string): Promise<string | null> => {
  const r = await orm().select({ value: workspacePrefs.value }).from(workspacePrefs).where(and(scoped(workspacePrefs), eq(workspacePrefs.key, key))).then(one);
  return r?.value ?? null;
};
const set = async (key: string, value: string) => {
  const by = owner();
  await orm().insert(workspacePrefs).values({ ...by, key, value }).onConflictDoUpdate({ target: [workspacePrefs.workspaceId, workspacePrefs.key], set: { value, userId: by.userId } });
};

export interface SfxPrefs {
  enabled: boolean;
  /** 0-1 master level. */
  volume: number;
}

/** Small switches that are not part of any channel or video: per workspace, except the worker heartbeat. */
export const prefsService = {
  /** The worker calls this every few seconds; the web app reads it to tell whether background work is being picked up. */
  workerBeat: async (): Promise<void> => await setSystem('worker_seen_at', String(Date.now())),
  workerSeenAt: async (): Promise<number | null> => {
    const v = Number(await getSystem('worker_seen_at'));
    return Number.isFinite(v) && await getSystem('worker_seen_at') !== null ? v : null;
  },

  /** One-time markers ("this was done once"), so a thing a person later undoes is not redone. */
  flag: async (key: string): Promise<boolean> => await get(`flag:${key}`) === '1',
  setFlag: async (key: string): Promise<void> => await set(`flag:${key}`, '1'),

  /** The first-run guide on the home screen: dismissed for good once a person closes it. */
  onboardingDismissed: async (): Promise<boolean> => await get('onboarding_dismissed') === '1',
  setOnboardingDismissed: async (dismissed: boolean): Promise<boolean> => {
    await set('onboarding_dismissed', dismissed ? '1' : '0');
    return dismissed;
  },

  async sfxEnabled(): Promise<boolean> {
    return await get('sfx_enabled') !== '0';
  },
  async sfxVolume(): Promise<number> {
    const v = Number(await get('sfx_volume'));
    return Number.isFinite(v) && await get('sfx_volume') !== null ? Math.min(1, Math.max(0, v)) : 0.8;
  },
  async sfx(): Promise<SfxPrefs> {
    return { enabled: await prefsService.sfxEnabled(), volume: await prefsService.sfxVolume() };
  },
  async saveSfx(input: Partial<SfxPrefs>): Promise<SfxPrefs> {
    if (input.enabled !== undefined) await set('sfx_enabled', input.enabled ? '1' : '0');
    if (input.volume !== undefined) await set('sfx_volume', String(Math.min(1, Math.max(0, input.volume))));
    return prefsService.sfx();
  },
};
