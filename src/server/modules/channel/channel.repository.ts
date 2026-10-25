import type { Channel } from '@/core/domain';
import { db, json } from '@/server/db';

type Row = Record<string, unknown>;

const toChannel = (r: Row): Channel => ({
  id: String(r.id),
  name: String(r.name),
  audience: String(r.audience),
  style: String(r.style),
  voice: String(r.voice) as Channel['voice'],
  outroText: String(r.outro_text),
  subscribeText: String(r.subscribe_text),
  hashtags: json<string[]>(r.hashtags, []),
  palette: json<string[]>(r.palette, []),
  logoPath: (r.logo_path as string | null) ?? null,
  defaultSkillId: (r.default_skill_id as string | null) ?? null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export const channelRepository = {
  list(): Channel[] {
    return (db().prepare('SELECT * FROM channels ORDER BY created_at').all() as Row[]).map(toChannel);
  },
  find(id: string): Channel | null {
    const r = db().prepare('SELECT * FROM channels WHERE id = ?').get(id) as Row | undefined;
    return r ? toChannel(r) : null;
  },
  count(): number {
    return (db().prepare('SELECT COUNT(*) AS n FROM channels').get() as { n: number }).n;
  },
  insert(c: Channel) {
    db()
      .prepare(
        `INSERT INTO channels (id, name, audience, style, voice, outro_text, subscribe_text, hashtags, palette, logo_path, default_skill_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(c.id, c.name, c.audience, c.style, c.voice, c.outroText, c.subscribeText, JSON.stringify(c.hashtags), JSON.stringify(c.palette), c.logoPath, c.defaultSkillId, c.createdAt, c.updatedAt);
  },
  update(c: Channel) {
    db()
      .prepare(
        `UPDATE channels SET name = ?, audience = ?, style = ?, voice = ?, outro_text = ?, subscribe_text = ?, hashtags = ?, palette = ?,
         logo_path = ?, default_skill_id = ?, updated_at = ? WHERE id = ?`,
      )
      .run(c.name, c.audience, c.style, c.voice, c.outroText, c.subscribeText, JSON.stringify(c.hashtags), JSON.stringify(c.palette), c.logoPath, c.defaultSkillId, c.updatedAt, c.id);
  },
  remove(id: string) {
    db().prepare('DELETE FROM channels WHERE id = ?').run(id);
  },
  projectCount(id: string): number {
    return (db().prepare('SELECT COUNT(*) AS n FROM projects WHERE channel_id = ?').get(id) as { n: number }).n;
  },
};
