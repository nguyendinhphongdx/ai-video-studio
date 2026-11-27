import { and, asc, count, eq } from 'drizzle-orm';

import type { Channel } from '@/core/domain';
import { json } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { channels, episodes } from '@/server/schema';

type Row = typeof channels.$inferSelect;

const dj = (d: unknown) => (d ? JSON.stringify(d) : null);

const toChannel = (r: Row): Channel => ({
  id: r.id,
  name: r.name,
  description: r.description,
  audience: r.audience,
  style: r.style,
  voice: r.voice as Channel['voice'],
  outroText: r.outroText,
  subscribeText: r.subscribeText,
  hashtags: json<string[]>(r.hashtags, []),
  palette: json<string[]>(r.palette, []),
  music: r.music,
  font: r.font as Channel['font'],
  imageStyle: r.imageStyle,
  introDesign: json<Channel['introDesign']>(r.introDesign, null),
  outroDesign: json<Channel['outroDesign']>(r.outroDesign, null),
  introArtPath: r.introArtPath,
  outroArtPath: r.outroArtPath,
  logoPath: r.logoPath,
  avatarPath: r.avatarPath,
  defaultSkillId: r.defaultSkillId,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

/** The columns a person edits (insert and update share them). */
const fields = (c: Channel) => ({
  name: c.name,
  description: c.description,
  font: c.font,
  audience: c.audience,
  style: c.style,
  voice: c.voice,
  outroText: c.outroText,
  subscribeText: c.subscribeText,
  hashtags: JSON.stringify(c.hashtags),
  palette: JSON.stringify(c.palette),
  music: c.music,
  logoPath: c.logoPath,
  defaultSkillId: c.defaultSkillId,
  avatarPath: c.avatarPath,
  imageStyle: c.imageStyle,
  introDesign: dj(c.introDesign),
  outroDesign: dj(c.outroDesign),
  introArtPath: c.introArtPath,
  outroArtPath: c.outroArtPath,
  updatedAt: c.updatedAt,
});

export const channelRepository = {
  async list(): Promise<Channel[]> {
    return (await orm().select().from(channels).where(scoped(channels)).orderBy(asc(channels.createdAt))).map(toChannel);
  },
  async find(id: string): Promise<Channel | null> {
    const r = await orm().select().from(channels).where(and(eq(channels.id, id), scoped(channels))).then(one);
    return r ? toChannel(r) : null;
  },
  async count(): Promise<number> {
    return (await orm().select({ n: count() }).from(channels).where(scoped(channels)).then(one))?.n ?? 0;
  },
  async insert(c: Channel) {
    await orm().insert(channels).values({ id: c.id, ...fields(c), createdAt: c.createdAt, ...owner() });
  },
  async update(c: Channel) {
    await orm().update(channels).set(fields(c)).where(and(eq(channels.id, c.id), scoped(channels)));
  },
  async remove(id: string) {
    await orm().delete(channels).where(and(eq(channels.id, id), scoped(channels)));
  },
  async projectCount(id: string): Promise<number> {
    return (await orm().select({ n: count() }).from(episodes).where(and(eq(episodes.channelId, id), scoped(episodes))).then(one))?.n ?? 0;
  },
};
