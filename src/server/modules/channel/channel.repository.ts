import type { Channel } from '@/core/domain';
import { db, json } from '@/server/db';
import { ctx } from '@/server/context';

type Row = Record<string, unknown>;

const dj = (d: unknown) => (d ? JSON.stringify(d) : null);

const toChannel = (r: Row): Channel => ({
  id: String(r.id),
  name: String(r.name),
  description: String(r.description ?? ''),
  audience: String(r.audience),
  style: String(r.style),
  voice: String(r.voice) as Channel['voice'],
  outroText: String(r.outro_text),
  subscribeText: String(r.subscribe_text),
  hashtags: json<string[]>(r.hashtags, []),
  palette: json<string[]>(r.palette, []),
  music: String(r.music),
  font: String(r.font ?? 'Baloo2') as Channel['font'],
  imageStyle: String(r.image_style ?? ''),
  introDesign: json<Channel['introDesign']>(r.intro_design, null),
  outroDesign: json<Channel['outroDesign']>(r.outro_design, null),
  introArtPath: (r.intro_art_path as string | null) ?? null,
  outroArtPath: (r.outro_art_path as string | null) ?? null,
  logoPath: (r.logo_path as string | null) ?? null,
  avatarPath: (r.avatar_path as string | null) ?? null,
  defaultSkillId: (r.default_skill_id as string | null) ?? null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export const channelRepository = {
  async list(): Promise<Channel[]> {
    return (db().prepare('SELECT * FROM channels WHERE workspace_id = ? ORDER BY created_at').all(ctx().workspaceId) as Row[]).map(toChannel);
  },
  async find(id: string): Promise<Channel | null> {
    const r = db().prepare('SELECT * FROM channels WHERE id = ? AND workspace_id = ?').get(id, ctx().workspaceId) as Row | undefined;
    return r ? toChannel(r) : null;
  },
  async count(): Promise<number> {
    return (db().prepare('SELECT COUNT(*) AS n FROM channels WHERE workspace_id = ?').get(ctx().workspaceId) as { n: number }).n;
  },
  async insert(c: Channel) {
    db()
      .prepare(
        `INSERT INTO channels (id, name, description, font, audience, style, voice, outro_text, subscribe_text, hashtags, palette, music, logo_path, default_skill_id, avatar_path, image_style, intro_design, outro_design, intro_art_path, outro_art_path, created_at, updated_at, workspace_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(c.id, c.name, c.description, c.font, c.audience, c.style, c.voice, c.outroText, c.subscribeText, JSON.stringify(c.hashtags), JSON.stringify(c.palette), c.music, c.logoPath, c.defaultSkillId, c.avatarPath, c.imageStyle, dj(c.introDesign), dj(c.outroDesign), c.introArtPath, c.outroArtPath, c.createdAt, c.updatedAt, ctx().workspaceId, ctx().userId);
  },
  async update(c: Channel) {
    db()
      .prepare(
        `UPDATE channels SET name = ?, description = ?, font = ?, audience = ?, style = ?, voice = ?, outro_text = ?, subscribe_text = ?, hashtags = ?, palette = ?, music = ?,
         logo_path = ?, default_skill_id = ?, avatar_path = ?, image_style = ?, intro_design = ?, outro_design = ?, intro_art_path = ?, outro_art_path = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
      )
      .run(c.name, c.description, c.font, c.audience, c.style, c.voice, c.outroText, c.subscribeText, JSON.stringify(c.hashtags), JSON.stringify(c.palette), c.music, c.logoPath, c.defaultSkillId, c.avatarPath, c.imageStyle, dj(c.introDesign), dj(c.outroDesign), c.introArtPath, c.outroArtPath, c.updatedAt, c.id, ctx().workspaceId);
  },
  async remove(id: string) {
    db().prepare('DELETE FROM channels WHERE id = ? AND workspace_id = ?').run(id, ctx().workspaceId);
  },
  async projectCount(id: string): Promise<number> {
    return (db().prepare('SELECT COUNT(*) AS n FROM episodes WHERE channel_id = ? AND workspace_id = ?').get(id, ctx().workspaceId) as { n: number }).n;
  },
};
