// Two stores. The market is files shipped with the app (market/skills/<id>/SKILL.md): a catalogue to install from.
// A channel's skills live in SQLite (channel_skills): that is what videos of the channel actually use.
import fs from 'node:fs/promises';
import path from 'node:path';

import { SKILL_ID_RE } from '@/core/skills/skill';
import { MARKET_SKILLS_DIR } from '@/server/config';
import { and, asc, count, countDistinct, eq, isNotNull } from 'drizzle-orm';

import { one, orm, owner, scoped } from '@/server/orm';
import { channels, channelSkills, episodes, series, seriesVersions } from '@/server/schema';

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

const toRow = (r: typeof channelSkills.$inferSelect): ChannelSkillRow => ({
  channelId: r.channelId,
  skillId: r.skillId,
  markdown: r.markdown,
  source: r.source,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const thisSkill = (channelId: string, skillId: string) => and(eq(channelSkills.channelId, channelId), eq(channelSkills.skillId, skillId), scoped(channelSkills));
/** Series versions of a channel's series, in this workspace. */
const channelSeriesVersions = (channelId: string) => and(eq(series.channelId, channelId), scoped(series), scoped(seriesVersions));

export const channelSkillRepository = {
  async list(channelId: string): Promise<ChannelSkillRow[]> {
    return (await orm().select().from(channelSkills).where(and(eq(channelSkills.channelId, channelId), scoped(channelSkills))).orderBy(asc(channelSkills.createdAt), asc(channelSkills.skillId))).map(toRow);
  },
  async find(channelId: string, skillId: string): Promise<ChannelSkillRow | null> {
    const r = await orm().select().from(channelSkills).where(thisSkill(channelId, skillId)).then(one);
    return r ? toRow(r) : null;
  },
  async insert(row: Omit<ChannelSkillRow, 'updatedAt'>) {
    await orm().insert(channelSkills).values({ ...row, updatedAt: row.createdAt, ...owner() });
  },
  async update(channelId: string, skillId: string, markdown: string, updatedAt: string) {
    await orm().update(channelSkills).set({ markdown, updatedAt }).where(thisSkill(channelId, skillId));
  },
  /** Replaces a skill with a newer market version (and points its source at the market id it now follows). */
  async replaceFromMarket(channelId: string, skillId: string, markdown: string, source: string, updatedAt: string) {
    await orm().update(channelSkills).set({ markdown, source, updatedAt }).where(thisSkill(channelId, skillId));
  },
  async remove(channelId: string, skillId: string) {
    await orm().delete(channelSkills).where(thisSkill(channelId, skillId));
  },
  /** Skill ids a channel's videos, series or default already point at (to adopt them from the market). */
  async referenced(channelId: string): Promise<string[]> {
    const fromEpisodes = await orm().selectDistinct({ id: episodes.skillId }).from(episodes).where(and(eq(episodes.channelId, channelId), scoped(episodes)));
    const fromSeries = await orm().selectDistinct({ id: seriesVersions.skillId }).from(seriesVersions).innerJoin(series, eq(series.id, seriesVersions.seriesId)).where(channelSeriesVersions(channelId));
    const fromDefault = await orm().select({ id: channels.defaultSkillId }).from(channels).where(and(eq(channels.id, channelId), scoped(channels), isNotNull(channels.defaultSkillId)));
    return [...new Set([...fromEpisodes, ...fromSeries, ...fromDefault].map((r) => r.id!))];
  },
  /** How many videos and series versions use the skill. */
  async usage(channelId: string, skillId: string): Promise<{ episodes: number; series: number }> {
    const e = await orm().select({ n: count() }).from(episodes).where(and(eq(episodes.channelId, channelId), eq(episodes.skillId, skillId), scoped(episodes))).then(one);
    const s = await orm()
      .select({ n: countDistinct(seriesVersions.seriesId) })
      .from(seriesVersions)
      .innerJoin(series, eq(series.id, seriesVersions.seriesId))
      .where(and(channelSeriesVersions(channelId), eq(seriesVersions.skillId, skillId)))
      .then(one);
    return { episodes: e?.n ?? 0, series: s?.n ?? 0 };
  },
};
