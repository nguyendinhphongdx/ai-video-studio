import type { EpisodeMemory } from '@/core/domain';
import type { MemoryStore } from '@/core/ports';
import { db, json, now } from '@/server/db';
import { ctx } from '@/server/context';

type Row = Record<string, unknown>;

const toMemory = (r: Row): EpisodeMemory => ({
  episodeId: String(r.episode_id),
  seriesId: String(r.series_id),
  number: r.number === null ? null : Number(r.number),
  title: String(r.title),
  summary: String(r.summary),
  concepts: json(r.concepts, []),
  examples: json(r.examples, []),
  vocabulary: json(r.vocabulary, []),
  jokes: json(r.jokes, []),
  createdAt: String(r.created_at),
});

export const memoryRepository = {
  async list(seriesId: string): Promise<EpisodeMemory[]> {
    return (db().prepare('SELECT * FROM episode_memory WHERE series_id = ? AND workspace_id = ? ORDER BY number DESC, created_at DESC').all(seriesId, ctx().workspaceId) as Row[]).map(toMemory);
  },
  async setSeason(seriesId: string, summary: string) {
    db().prepare('INSERT INTO series_memory (series_id, season_summary, updated_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(series_id) DO UPDATE SET season_summary = excluded.season_summary, updated_at = excluded.updated_at WHERE series_memory.workspace_id = excluded.workspace_id').run(seriesId, summary, now(), ctx().workspaceId, ctx().userId);
  },
};

export const memoryStore: MemoryStore = {
  async recent(seriesId, beforeNumber, limit) {
    const rows = (
      beforeNumber === null
        ? db().prepare('SELECT * FROM episode_memory WHERE series_id = ? AND workspace_id = ? ORDER BY number DESC LIMIT ?').all(seriesId, ctx().workspaceId, limit)
        : db().prepare('SELECT * FROM episode_memory WHERE series_id = ? AND workspace_id = ? AND number < ? ORDER BY number DESC LIMIT ?').all(seriesId, ctx().workspaceId, beforeNumber, limit)
    ) as Row[];
    return rows.map(toMemory);
  },
  async season(seriesId) {
    const r = db().prepare('SELECT season_summary FROM series_memory WHERE series_id = ? AND workspace_id = ?').get(seriesId, ctx().workspaceId) as { season_summary: string } | undefined;
    return r?.season_summary ?? null;
  },
  async setSeason(seriesId, summary) {
    await memoryRepository.setSeason(seriesId, summary);
  },
  async all(seriesId) {
    return (await memoryRepository.list(seriesId)).reverse();
  },
  async save(m) {
    db()
      .prepare(
        `INSERT INTO episode_memory (episode_id, series_id, number, title, summary, concepts, examples, vocabulary, jokes, created_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(episode_id) DO UPDATE SET title = excluded.title, summary = excluded.summary, concepts = excluded.concepts, examples = excluded.examples,
         vocabulary = excluded.vocabulary, jokes = excluded.jokes, created_at = excluded.created_at WHERE episode_memory.workspace_id = excluded.workspace_id`,
      )
      .run(m.episodeId, m.seriesId, m.number, m.title, m.summary, JSON.stringify(m.concepts), JSON.stringify(m.examples), JSON.stringify(m.vocabulary), JSON.stringify(m.jokes), m.createdAt, ctx().workspaceId, ctx().userId);
  },
};
