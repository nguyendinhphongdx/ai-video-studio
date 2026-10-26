// Two stores. The market is files shipped with the app (market/skills/<id>/SKILL.md): a catalogue to install from.
// A channel's skills live in SQLite (channel_skills): that is what videos of the channel actually use.
import fs from 'node:fs/promises';
import path from 'node:path';

import { SKILL_ID_RE } from '@/core/skills/skill';
import { MARKET_SKILLS_DIR } from '@/server/config';
import { db } from '@/server/db';

type Row = Record<string, unknown>;

export const marketRepository = {
  async ids(): Promise<string[]> {
    const entries = await fs.readdir(MARKET_SKILLS_DIR, { withFileTypes: true }).catch(() => []);
    return entries.filter((e) => e.isDirectory() && SKILL_ID_RE.test(e.name)).map((e) => e.name).sort();
  },
  async read(id: string): Promise<string | null> {
    if (!SKILL_ID_RE.test(id)) return null;
    return fs.readFile(path.join(MARKET_SKILLS_DIR, id, 'SKILL.md'), 'utf8').catch(() => null);
  },
};

export interface ChannelSkillRow {
  channelId: string;
  skillId: string;
  markdown: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const toRow = (r: Row): ChannelSkillRow => ({
  channelId: String(r.channel_id),
  skillId: String(r.skill_id),
  markdown: String(r.markdown),
  source: String(r.source),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export const channelSkillRepository = {
  list(channelId: string): ChannelSkillRow[] {
    return (db().prepare('SELECT * FROM channel_skills WHERE channel_id = ? ORDER BY created_at, skill_id').all(channelId) as Row[]).map(toRow);
  },
  find(channelId: string, skillId: string): ChannelSkillRow | null {
    const r = db().prepare('SELECT * FROM channel_skills WHERE channel_id = ? AND skill_id = ?').get(channelId, skillId) as Row | undefined;
    return r ? toRow(r) : null;
  },
  insert(row: Omit<ChannelSkillRow, 'updatedAt'>) {
    db()
      .prepare('INSERT INTO channel_skills (channel_id, skill_id, markdown, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(row.channelId, row.skillId, row.markdown, row.source, row.createdAt, row.createdAt);
  },
  update(channelId: string, skillId: string, markdown: string, updatedAt: string) {
    db().prepare('UPDATE channel_skills SET markdown = ?, updated_at = ? WHERE channel_id = ? AND skill_id = ?').run(markdown, updatedAt, channelId, skillId);
  },
  remove(channelId: string, skillId: string) {
    db().prepare('DELETE FROM channel_skills WHERE channel_id = ? AND skill_id = ?').run(channelId, skillId);
  },
  /** Skill ids a channel's videos, series or default already point at (to adopt them from the market). */
  referenced(channelId: string): string[] {
    const rows = db()
      .prepare(
        `SELECT skill_id AS id FROM episodes WHERE channel_id = ?
         UNION SELECT v.skill_id FROM series_versions v JOIN series s ON s.id = v.series_id WHERE s.channel_id = ?
         UNION SELECT default_skill_id FROM channels WHERE id = ? AND default_skill_id IS NOT NULL`,
      )
      .all(channelId, channelId, channelId) as { id: string }[];
    return rows.map((r) => r.id);
  },
  /** How many videos and series versions use the skill. */
  usage(channelId: string, skillId: string): { episodes: number; series: number } {
    const e = db().prepare('SELECT COUNT(*) AS n FROM episodes WHERE channel_id = ? AND skill_id = ?').get(channelId, skillId) as { n: number };
    const s = db().prepare('SELECT COUNT(DISTINCT v.series_id) AS n FROM series_versions v JOIN series s ON s.id = v.series_id WHERE s.channel_id = ? AND v.skill_id = ?').get(channelId, skillId) as { n: number };
    return { episodes: e.n, series: s.n };
  },
};
