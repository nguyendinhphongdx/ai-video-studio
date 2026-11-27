import type { Series, SeriesVersion } from '@/core/domain';
import { db, json } from '@/server/db';
import { ctx } from '@/server/context';

type Row = Record<string, unknown>;

const toSeries = (r: Row): Series => ({
  id: String(r.id),
  channelId: String(r.channel_id),
  name: String(r.name),
  status: String(r.status) as Series['status'],
  currentVersion: Number(r.current_version),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toVersion = (r: Row): SeriesVersion => ({
  seriesId: String(r.series_id),
  version: Number(r.version),
  skillId: String(r.skill_id),
  bible: json(r.bible, null as never),
  format: json(r.format, null as never),
  publish: json(r.publish, null as never),
  createdAt: String(r.created_at),
});

export const seriesRepository = {
  async list(channelId: string): Promise<Series[]> {
    return (db().prepare('SELECT * FROM series WHERE channel_id = ? AND workspace_id = ? ORDER BY created_at').all(channelId, ctx().workspaceId) as Row[]).map(toSeries);
  },
  async find(id: string): Promise<Series | null> {
    const r = db().prepare('SELECT * FROM series WHERE id = ? AND workspace_id = ?').get(id, ctx().workspaceId) as Row | undefined;
    return r ? toSeries(r) : null;
  },
  async version(seriesId: string, version: number): Promise<SeriesVersion | null> {
    const r = db().prepare('SELECT * FROM series_versions WHERE series_id = ? AND version = ? AND workspace_id = ?').get(seriesId, version, ctx().workspaceId) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  async versions(seriesId: string): Promise<SeriesVersion[]> {
    return (db().prepare('SELECT * FROM series_versions WHERE series_id = ? AND workspace_id = ? ORDER BY version DESC').all(seriesId, ctx().workspaceId) as Row[]).map(toVersion);
  },
  async insert(s: Series) {
    db()
      .prepare('INSERT INTO series (id, channel_id, name, status, current_version, created_at, updated_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(s.id, s.channelId, s.name, s.status, s.currentVersion, s.createdAt, s.updatedAt, ctx().workspaceId, ctx().userId);
  },
  async update(s: Series) {
    db().prepare('UPDATE series SET name = ?, status = ?, current_version = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(s.name, s.status, s.currentVersion, s.updatedAt, s.id, ctx().workspaceId);
  },
  async insertVersion(v: SeriesVersion) {
    db()
      .prepare('INSERT INTO series_versions (series_id, version, skill_id, bible, format, publish, created_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(v.seriesId, v.version, v.skillId, JSON.stringify(v.bible), JSON.stringify(v.format), JSON.stringify(v.publish), v.createdAt, ctx().workspaceId, ctx().userId);
  },
};
