import { and, asc, desc, eq } from 'drizzle-orm';

import type { Series, SeriesVersion } from '@/core/domain';
import { json } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { announced } from '@/server/modules/changes/changes.repository';
import { series, seriesVersions } from '@/server/schema';

const toSeries = (r: typeof series.$inferSelect): Series => ({
  id: r.id,
  channelId: r.channelId,
  name: r.name,
  status: r.status as Series['status'],
  currentVersion: r.currentVersion,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const toVersion = (r: typeof seriesVersions.$inferSelect): SeriesVersion => ({
  seriesId: r.seriesId,
  version: r.version,
  skillId: r.skillId,
  bible: json(r.bible, null as never),
  format: json(r.format, null as never),
  publish: json(r.publish, null as never),
  createdAt: r.createdAt,
});

export const seriesRepository = {
  async list(channelId: string): Promise<Series[]> {
    return (await orm().select().from(series).where(and(eq(series.channelId, channelId), scoped(series))).orderBy(asc(series.createdAt))).map(toSeries);
  },
  async find(id: string): Promise<Series | null> {
    const r = await orm().select().from(series).where(and(eq(series.id, id), scoped(series))).then(one);
    return r ? toSeries(r) : null;
  },
  async version(seriesId: string, version: number): Promise<SeriesVersion | null> {
    const r = await orm().select().from(seriesVersions).where(and(eq(seriesVersions.seriesId, seriesId), eq(seriesVersions.version, version), scoped(seriesVersions))).then(one);
    return r ? toVersion(r) : null;
  },
  async versions(seriesId: string): Promise<SeriesVersion[]> {
    return (await orm().select().from(seriesVersions).where(and(eq(seriesVersions.seriesId, seriesId), scoped(seriesVersions))).orderBy(desc(seriesVersions.version))).map(toVersion);
  },
  async insert(s: Series) {
    await announced('series', s.id, { channelId: s.channelId }, async () => void (await orm().insert(series).values({ ...s, ...owner() })));
  },
  async update(s: Series) {
    await announced('series', s.id, { channelId: s.channelId }, async () => void (await orm().update(series).set({ name: s.name, status: s.status, currentVersion: s.currentVersion, updatedAt: s.updatedAt }).where(and(eq(series.id, s.id), scoped(series)))));
  },
  async insertVersion(v: SeriesVersion) {
    await announced('series', v.seriesId, {}, async () => {
      await orm()
        .insert(seriesVersions)
        .values({ seriesId: v.seriesId, version: v.version, skillId: v.skillId, bible: JSON.stringify(v.bible), format: JSON.stringify(v.format), publish: JSON.stringify(v.publish), createdAt: v.createdAt, ...owner() });
    });
  },
};
