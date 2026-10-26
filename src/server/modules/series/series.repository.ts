import type { Series, SeriesVersion } from '@/core/domain';
import { db, json } from '@/server/db';

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
  list(channelId: string): Series[] {
    return (db().prepare('SELECT * FROM series WHERE channel_id = ? ORDER BY created_at').all(channelId) as Row[]).map(toSeries);
  },
  find(id: string): Series | null {
    const r = db().prepare('SELECT * FROM series WHERE id = ?').get(id) as Row | undefined;
    return r ? toSeries(r) : null;
  },
  version(seriesId: string, version: number): SeriesVersion | null {
    const r = db().prepare('SELECT * FROM series_versions WHERE series_id = ? AND version = ?').get(seriesId, version) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  versions(seriesId: string): SeriesVersion[] {
    return (db().prepare('SELECT * FROM series_versions WHERE series_id = ? ORDER BY version DESC').all(seriesId) as Row[]).map(toVersion);
  },
  insert(s: Series) {
    db()
      .prepare('INSERT INTO series (id, channel_id, name, status, current_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(s.id, s.channelId, s.name, s.status, s.currentVersion, s.createdAt, s.updatedAt);
  },
  update(s: Series) {
    db().prepare('UPDATE series SET name = ?, status = ?, current_version = ?, updated_at = ? WHERE id = ?').run(s.name, s.status, s.currentVersion, s.updatedAt, s.id);
  },
  insertVersion(v: SeriesVersion) {
    db()
      .prepare('INSERT INTO series_versions (series_id, version, skill_id, bible, format, publish, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(v.seriesId, v.version, v.skillId, JSON.stringify(v.bible), JSON.stringify(v.format), JSON.stringify(v.publish), v.createdAt);
  },
};
