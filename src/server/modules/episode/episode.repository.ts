import type { Episode, EpisodeEvent, Format, Render, Scene, SceneAssets } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { EpisodePatch } from '@/core/ports';
import { db, json, now, transaction } from '@/server/db';

type Row = Record<string, unknown>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const toScene = (r: Row): Scene => ({
  id: String(r.id),
  slotId: String(r.slot_id),
  block: String(r.block),
  locked: Boolean(r.locked),
  narration: String(r.narration),
  props: json(r.props, {}),
  approved: Boolean(r.approved),
  assets: {
    imagePath: (r.image_path as string | null) ?? null,
    imageHash: (r.image_hash as string | null) ?? null,
    voicePath: (r.voice_path as string | null) ?? null,
    voiceSeconds: num(r.voice_seconds),
    voiceHash: (r.voice_hash as string | null) ?? null,
  },
});

const toEpisode = (r: Row, scenes: Scene[]): Episode => ({
  id: String(r.id),
  channelId: String(r.channel_id),
  seriesId: (r.series_id as string | null) ?? null,
  seriesVersion: num(r.series_version),
  knowledgeVersion: num(r.knowledge_version),
  number: num(r.number),
  topic: String(r.topic),
  goal: String(r.goal),
  notes: String(r.notes),
  skillId: String(r.skill_id),
  status: String(r.status) as Episode['status'],
  formats: json<Format[]>(r.formats, ['landscape']),
  voice: String(r.voice) as Episode['voice'],
  music: Boolean(r.music),
  autoImages: Boolean(r.auto_images),
  autoVoice: Boolean(r.auto_voice),
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
  thumbnailPath: (r.thumbnail_path as string | null) ?? null,
  durationSec: Number(r.duration_sec),
  createdAt: String(r.created_at),
});

const scenesOf = (episodeId: string) => (db().prepare('SELECT * FROM scenes WHERE episode_id = ? ORDER BY position').all(episodeId) as Row[]).map(toScene);

export type EpisodeUpdate = EpisodePatch & Partial<Pick<Episode, 'formats' | 'voice' | 'music' | 'topic' | 'goal' | 'notes' | 'skillId' | 'autoImages' | 'autoVoice'>>;

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
  insert(e: Omit<Episode, 'scenes' | 'publish' | 'title' | 'knowledgeVersion' | 'autoImages' | 'autoVoice'>) {
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
      if (patch.knowledgeVersion !== undefined) set('knowledge_version', patch.knowledgeVersion);
      if (patch.formats !== undefined) set('formats', JSON.stringify(patch.formats));
      if (patch.voice !== undefined) set('voice', patch.voice);
      if (patch.music !== undefined) set('music', patch.music ? 1 : 0);
      if (patch.topic !== undefined) set('topic', patch.topic);
      if (patch.goal !== undefined) set('goal', patch.goal);
      if (patch.notes !== undefined) set('notes', patch.notes);
      if (patch.skillId !== undefined) set('skill_id', patch.skillId);
      if (patch.autoImages !== undefined) set('auto_images', patch.autoImages ? 1 : 0);
      if (patch.autoVoice !== undefined) set('auto_voice', patch.autoVoice ? 1 : 0);
      set('updated_at', now());
      db().prepare(`UPDATE episodes SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
      if (patch.scenes) {
        db().prepare('DELETE FROM scenes WHERE episode_id = ?').run(id);
        const ins = db().prepare('INSERT INTO scenes (id, episode_id, position, slot_id, block, locked, narration, props, approved, image_path, image_hash, voice_path, voice_seconds, voice_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        patch.scenes.forEach((s, i) => ins.run(s.id, id, i, s.slotId, s.block, s.locked ? 1 : 0, s.narration, JSON.stringify(s.props), s.approved ? 1 : 0, s.assets.imagePath, s.assets.imageHash, s.assets.voicePath, s.assets.voiceSeconds, s.assets.voiceHash));
      }
    });
  },
  /** Store a generated picture/voice (or the approval) of one scene without touching the rest of the script. */
  updateScene(episodeId: string, sceneId: string, patch: Partial<SceneAssets> & { approved?: boolean }) {
    const map: Record<string, string> = { imagePath: 'image_path', imageHash: 'image_hash', voicePath: 'voice_path', voiceSeconds: 'voice_seconds', voiceHash: 'voice_hash' };
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, col] of Object.entries(map)) {
      const v = (patch as Record<string, string | number | null | undefined>)[k];
      if (v !== undefined) (sets.push(`${col} = ?`), values.push(v));
    }
    if (patch.approved !== undefined) (sets.push('approved = ?'), values.push(patch.approved ? 1 : 0));
    if (!sets.length) return;
    db().prepare(`UPDATE scenes SET ${sets.join(', ')} WHERE id = ? AND episode_id = ?`).run(...values, sceneId, episodeId);
    episodeRepository.touch(episodeId);
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
  /** Episode counts per status, by series (for series cards). */
  countsBySeries(channelId: string): Map<string, Partial<Record<Episode['status'], number>>> {
    const rows = db().prepare('SELECT series_id AS s, status, COUNT(*) AS n FROM episodes WHERE channel_id = ? AND series_id IS NOT NULL GROUP BY series_id, status').all(channelId) as { s: string; status: Episode['status']; n: number }[];
    const out = new Map<string, Partial<Record<Episode['status'], number>>>();
    for (const r of rows) out.set(r.s, { ...out.get(r.s), [r.status]: r.n });
    return out;
  },
  /** Assign episode numbers atomically (the series/number index is unique, so go through negative numbers). */
  renumber(assignments: { id: string; number: number }[]) {
    transaction(() => {
      const set = db().prepare('UPDATE episodes SET number = ?, updated_at = ? WHERE id = ?');
      assignments.forEach((a, i) => set.run(-(i + 1), now(), a.id));
      for (const a of assignments) set.run(a.number, now(), a.id);
    });
  },
  renders(episodeId: string): Render[] {
    return (db().prepare('SELECT * FROM renders WHERE episode_id = ? ORDER BY format').all(episodeId) as Row[]).map(toRender);
  },
  replaceRenders(episodeId: string, renders: Omit<Render, 'id' | 'episodeId' | 'createdAt'>[]): Render[] {
    transaction(() => {
      db().prepare('DELETE FROM renders WHERE episode_id = ?').run(episodeId);
      const ins = db().prepare('INSERT INTO renders (id, episode_id, format, file_path, thumbnail_path, duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const r of renders) ins.run(newId(), episodeId, r.format, r.filePath, r.thumbnailPath, r.durationSec, now());
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
