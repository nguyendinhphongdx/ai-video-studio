import type { Episode, EpisodeEvent, Format, Render, Scene } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { EpisodePatch } from '@/core/ports';
import { db, json, now, transaction } from '@/server/db';

type Row = Record<string, unknown>;

const toScene = (r: Row): Scene => ({
  id: String(r.id),
  slotId: String(r.slot_id),
  block: String(r.block),
  locked: Boolean(r.locked),
  narration: String(r.narration),
  props: json(r.props, {}),
});

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const toEpisode = (r: Row, scenes: Scene[]): Episode => ({
  id: String(r.id),
  channelId: String(r.channel_id),
  seriesId: (r.series_id as string | null) ?? null,
  seriesVersion: num(r.series_version),
  number: num(r.number),
  topic: String(r.topic),
  goal: String(r.goal),
  notes: String(r.notes),
  skillId: String(r.skill_id),
  status: String(r.status) as Episode['status'],
  formats: json<Format[]>(r.formats, ['landscape']),
  voice: String(r.voice) as Episode['voice'],
  music: Boolean(r.music),
  sceneCount: num(r.scene_count),
  title: String(r.title),
  scenes,
  publish: json(r.publish, null),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toRender = (r: Row): Render => ({
  id: String(r.id),
  episodeId: String(r.episode_id),
  format: String(r.format) as Format,
  filePath: String(r.file_path),
  durationSec: Number(r.duration_sec),
  createdAt: String(r.created_at),
});

const scenesOf = (episodeId: string) => (db().prepare('SELECT * FROM scenes WHERE episode_id = ? ORDER BY position').all(episodeId) as Row[]).map(toScene);

export type EpisodeUpdate = EpisodePatch & Partial<Pick<Episode, 'formats' | 'voice' | 'music' | 'topic' | 'goal' | 'notes'>>;

export const episodeRepository = {
  list(filter: { channelId?: string; seriesId?: string } = {}): Episode[] {
    const where: string[] = [];
    const args: string[] = [];
    if (filter.channelId) (where.push('channel_id = ?'), args.push(filter.channelId));
    if (filter.seriesId) (where.push('series_id = ?'), args.push(filter.seriesId));
    const order = filter.seriesId ? 'number, created_at' : 'created_at DESC';
    const rows = db().prepare(`SELECT * FROM episodes ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`).all(...args) as Row[];
    return rows.map((r) => toEpisode(r, scenesOf(String(r.id))));
  },
  find(id: string): Episode | null {
    const r = db().prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Row | undefined;
    return r ? toEpisode(r, scenesOf(id)) : null;
  },
  insert(e: Omit<Episode, 'scenes' | 'publish' | 'title'>) {
    db()
      .prepare(
        `INSERT INTO episodes (id, channel_id, series_id, series_version, number, topic, goal, notes, skill_id, status, formats, voice, music, scene_count, title, publish, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?, ?)`,
      )
      .run(e.id, e.channelId, e.seriesId, e.seriesVersion, e.number, e.topic, e.goal, e.notes, e.skillId, e.status, JSON.stringify(e.formats), e.voice, e.music ? 1 : 0, e.sceneCount, e.createdAt, e.updatedAt);
  },
  update(id: string, patch: EpisodeUpdate) {
    transaction(() => {
      const sets: string[] = [];
      const values: (string | number | null)[] = [];
      const set = (col: string, v: string | number | null) => (sets.push(`${col} = ?`), values.push(v));
      if (patch.title !== undefined) set('title', patch.title);
      if (patch.status !== undefined) set('status', patch.status);
      if (patch.publish !== undefined) set('publish', patch.publish === null ? null : JSON.stringify(patch.publish));
      if (patch.seriesVersion !== undefined) set('series_version', patch.seriesVersion);
      if (patch.formats !== undefined) set('formats', JSON.stringify(patch.formats));
      if (patch.voice !== undefined) set('voice', patch.voice);
      if (patch.music !== undefined) set('music', patch.music ? 1 : 0);
      if (patch.topic !== undefined) set('topic', patch.topic);
      if (patch.goal !== undefined) set('goal', patch.goal);
      if (patch.notes !== undefined) set('notes', patch.notes);
      set('updated_at', now());
      db().prepare(`UPDATE episodes SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
      if (patch.scenes) {
        db().prepare('DELETE FROM scenes WHERE episode_id = ?').run(id);
        const ins = db().prepare('INSERT INTO scenes (id, episode_id, position, slot_id, block, locked, narration, props) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        patch.scenes.forEach((s, i) => ins.run(s.id, id, i, s.slotId, s.block, s.locked ? 1 : 0, s.narration, JSON.stringify(s.props)));
      }
    });
  },
  touch(id: string) {
    db().prepare('UPDATE episodes SET updated_at = ? WHERE id = ?').run(now(), id);
  },
  remove(id: string) {
    db().prepare('DELETE FROM episodes WHERE id = ?').run(id);
  },
  nextNumber(seriesId: string): number {
    const r = db().prepare('SELECT MAX(number) AS n FROM episodes WHERE series_id = ?').get(seriesId) as { n: number | null };
    return (r.n ?? 0) + 1;
  },
  renders(episodeId: string): Render[] {
    return (db().prepare('SELECT * FROM renders WHERE episode_id = ? ORDER BY format').all(episodeId) as Row[]).map(toRender);
  },
  replaceRenders(episodeId: string, renders: Omit<Render, 'id' | 'episodeId' | 'createdAt'>[]): Render[] {
    transaction(() => {
      db().prepare('DELETE FROM renders WHERE episode_id = ?').run(episodeId);
      const ins = db().prepare('INSERT INTO renders (id, episode_id, format, file_path, duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of renders) ins.run(newId(), episodeId, r.format, r.filePath, r.durationSec, now());
    });
    return episodeRepository.renders(episodeId);
  },
  events(episodeId: string): EpisodeEvent[] {
    return db().prepare('SELECT at, message FROM episode_events WHERE episode_id = ? ORDER BY id').all(episodeId) as unknown as EpisodeEvent[];
  },
  addEvent(episodeId: string, message: string) {
    db().prepare('INSERT INTO episode_events (episode_id, at, message) VALUES (?, ?, ?)').run(episodeId, now(), message);
    episodeRepository.touch(episodeId);
  },
};
