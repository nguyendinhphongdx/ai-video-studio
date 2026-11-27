import { and, desc, eq, lt, sql } from 'drizzle-orm';

import type { EpisodeMemory } from '@/core/domain';
import type { MemoryStore } from '@/core/ports';
import { json, now } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { episodeMemory, seriesMemory } from '@/server/schema';

const toMemory = (r: typeof episodeMemory.$inferSelect): EpisodeMemory => ({
  episodeId: r.episodeId,
  seriesId: r.seriesId,
  number: r.number,
  title: r.title,
  summary: r.summary,
  concepts: json(r.concepts, []),
  examples: json(r.examples, []),
  vocabulary: json(r.vocabulary, []),
  jokes: json(r.jokes, []),
  createdAt: r.createdAt,
});

const ofSeries = (seriesId: string) => and(eq(episodeMemory.seriesId, seriesId), scoped(episodeMemory));
/** On a conflict, only a row of this workspace is overwritten. */
const sameWorkspace = (table: typeof episodeMemory | typeof seriesMemory) => sql`${table.workspaceId} = excluded.workspace_id`;

export const memoryRepository = {
  async list(seriesId: string): Promise<EpisodeMemory[]> {
    return (await orm().select().from(episodeMemory).where(ofSeries(seriesId)).orderBy(desc(episodeMemory.number), desc(episodeMemory.createdAt))).map(toMemory);
  },
  async setSeason(seriesId: string, summary: string) {
    await orm()
      .insert(seriesMemory)
      .values({ seriesId, seasonSummary: summary, updatedAt: now(), ...owner() })
      .onConflictDoUpdate({ target: seriesMemory.seriesId, set: { seasonSummary: sql`excluded.season_summary`, updatedAt: sql`excluded.updated_at` }, setWhere: sameWorkspace(seriesMemory) });
  },
};

export const memoryStore: MemoryStore = {
  async recent(seriesId, beforeNumber, limit) {
    const where = beforeNumber === null ? ofSeries(seriesId) : and(ofSeries(seriesId), lt(episodeMemory.number, beforeNumber));
    return (await orm().select().from(episodeMemory).where(where).orderBy(desc(episodeMemory.number)).limit(limit)).map(toMemory);
  },
  async season(seriesId) {
    const r = await orm().select({ s: seriesMemory.seasonSummary }).from(seriesMemory).where(and(eq(seriesMemory.seriesId, seriesId), scoped(seriesMemory))).then(one);
    return r?.s ?? null;
  },
  async setSeason(seriesId, summary) {
    await memoryRepository.setSeason(seriesId, summary);
  },
  async all(seriesId) {
    return (await memoryRepository.list(seriesId)).reverse();
  },
  async save(m) {
    const row = {
      title: m.title, summary: m.summary, concepts: JSON.stringify(m.concepts), examples: JSON.stringify(m.examples), vocabulary: JSON.stringify(m.vocabulary), jokes: JSON.stringify(m.jokes), createdAt: m.createdAt,
    };
    await orm()
      .insert(episodeMemory)
      .values({ episodeId: m.episodeId, seriesId: m.seriesId, number: m.number, ...row, ...owner() })
      .onConflictDoUpdate({ target: episodeMemory.episodeId, set: row, setWhere: sameWorkspace(episodeMemory) });
  },
};
