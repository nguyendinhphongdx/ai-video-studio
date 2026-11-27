import { and, asc, count, desc, eq, inArray, isNotNull, max, type SQL } from 'drizzle-orm';

import type { Episode, EpisodeEvent, Format, Render, Scene, SceneAssets } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import type { EpisodePatch } from '@/core/ports';
import { ctx } from '@/server/context';
import { json, now, transaction } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { episodeEvents, episodes, renders, scenes } from '@/server/schema';

const toScene = (r: typeof scenes.$inferSelect): Scene => ({
  id: r.id,
  slotId: r.slotId,
  block: r.block,
  locked: r.locked,
  narration: r.narration,
  props: json(r.props, {}),
  approved: r.approved,
  assets: { imagePath: r.imagePath, imageHash: r.imageHash, voicePath: r.voicePath, voiceSeconds: r.voiceSeconds, voiceHash: r.voiceHash },
});

const toEpisode = (r: typeof episodes.$inferSelect, sceneList: Scene[]): Episode => ({
  id: r.id,
  channelId: r.channelId,
  seriesId: r.seriesId,
  seriesVersion: r.seriesVersion,
  knowledgeVersion: r.knowledgeVersion,
  number: r.number,
  topic: r.topic,
  goal: r.goal,
  notes: r.notes,
  skillId: r.skillId,
  status: r.status as Episode['status'],
  formats: json<Format[]>(r.formats, ['landscape']),
  voice: r.voice as Episode['voice'],
  music: r.music,
  autoImages: r.autoImages,
  autoVoice: r.autoVoice,
  sceneCount: r.sceneCount,
  title: r.title,
  scenes: sceneList,
  publish: json(r.publish, null),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const toRender = (r: typeof renders.$inferSelect): Render => ({
  id: r.id,
  episodeId: r.episodeId,
  format: r.format as Format,
  filePath: r.filePath,
  thumbnailPath: r.thumbnailPath,
  durationSec: r.durationSec,
  createdAt: r.createdAt,
});

/** The scenes of several episodes in one query, in script order. */
async function scenesOf(episodeIds: string[]): Promise<Map<string, Scene[]>> {
  const out = new Map<string, Scene[]>(episodeIds.map((id) => [id, []]));
  if (!episodeIds.length) return out;
  const rows = await orm().select().from(scenes).where(and(inArray(scenes.episodeId, episodeIds), scoped(scenes))).orderBy(asc(scenes.position));
  for (const r of rows) out.get(r.episodeId)?.push(toScene(r));
  return out;
}

export type EpisodeUpdate = EpisodePatch & Partial<Pick<Episode, 'formats' | 'voice' | 'music' | 'topic' | 'goal' | 'notes' | 'skillId' | 'autoImages' | 'autoVoice'>>;

const thisEpisode = (id: string) => and(eq(episodes.id, id), scoped(episodes));

export const episodeRepository = {
  async list(filter: { channelId?: string; seriesId?: string } = {}): Promise<Episode[]> {
    const where: SQL[] = [scoped(episodes)];
    if (filter.channelId) where.push(eq(episodes.channelId, filter.channelId));
    if (filter.seriesId) where.push(eq(episodes.seriesId, filter.seriesId));
    const order = filter.seriesId ? [asc(episodes.number), asc(episodes.createdAt)] : [desc(episodes.createdAt)];
    const rows = await orm().select().from(episodes).where(and(...where)).orderBy(...order);
    const byEpisode = await scenesOf(rows.map((r) => r.id));
    return rows.map((r) => toEpisode(r, byEpisode.get(r.id) ?? []));
  },
  async find(id: string): Promise<Episode | null> {
    const r = await orm().select().from(episodes).where(thisEpisode(id)).then(one);
    return r ? toEpisode(r, (await scenesOf([id])).get(id) ?? []) : null;
  },
  async insert(e: Omit<Episode, 'scenes' | 'publish' | 'title' | 'knowledgeVersion' | 'autoImages' | 'autoVoice'>) {
    await orm()
      .insert(episodes)
      .values({
        id: e.id, channelId: e.channelId, seriesId: e.seriesId, seriesVersion: e.seriesVersion, number: e.number, topic: e.topic, goal: e.goal, notes: e.notes, skillId: e.skillId, status: e.status,
        formats: JSON.stringify(e.formats), voice: e.voice, music: e.music, sceneCount: e.sceneCount, title: '', publish: null, createdAt: e.createdAt, updatedAt: e.updatedAt, ...owner(),
      });
  },
  async update(id: string, patch: EpisodeUpdate) {
    await transaction(async () => {
      const set: Partial<typeof episodes.$inferInsert> = { updatedAt: now() };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.status !== undefined) set.status = patch.status;
      if (patch.publish !== undefined) set.publish = patch.publish === null ? null : JSON.stringify(patch.publish);
      if (patch.seriesVersion !== undefined) set.seriesVersion = patch.seriesVersion;
      if (patch.knowledgeVersion !== undefined) set.knowledgeVersion = patch.knowledgeVersion;
      if (patch.formats !== undefined) set.formats = JSON.stringify(patch.formats);
      if (patch.voice !== undefined) set.voice = patch.voice;
      if (patch.music !== undefined) set.music = patch.music;
      if (patch.topic !== undefined) set.topic = patch.topic;
      if (patch.goal !== undefined) set.goal = patch.goal;
      if (patch.notes !== undefined) set.notes = patch.notes;
      if (patch.skillId !== undefined) set.skillId = patch.skillId;
      if (patch.autoImages !== undefined) set.autoImages = patch.autoImages;
      if (patch.autoVoice !== undefined) set.autoVoice = patch.autoVoice;
      const changed = await orm().update(episodes).set(set).where(thisEpisode(id)).returning({ id: episodes.id });
      if (patch.scenes && changed.length) {
        // Scenes are rewritten as a whole; a scene that already existed keeps the person who made it.
        const ofEpisode = and(eq(scenes.episodeId, id), scoped(scenes));
        const makers = new Map((await orm().select({ id: scenes.id, userId: scenes.userId }).from(scenes).where(ofEpisode)).map((r) => [r.id, r.userId]));
        await orm().delete(scenes).where(ofEpisode);
        if (patch.scenes.length) {
          await orm()
            .insert(scenes)
            .values(
              patch.scenes.map((s, i) => ({
                id: s.id, episodeId: id, position: i, slotId: s.slotId, block: s.block, locked: s.locked, narration: s.narration, props: JSON.stringify(s.props), approved: s.approved,
                imagePath: s.assets.imagePath, imageHash: s.assets.imageHash, voicePath: s.assets.voicePath, voiceSeconds: s.assets.voiceSeconds, voiceHash: s.assets.voiceHash,
                workspaceId: ctx().workspaceId, userId: makers.has(s.id) ? (makers.get(s.id) ?? null) : ctx().userId,
              })),
            );
        }
      }
    });
  },
  /** Store a generated picture/voice (or the approval) of one scene without touching the rest of the script. */
  async updateScene(episodeId: string, sceneId: string, patch: Partial<SceneAssets> & { approved?: boolean }) {
    const set: Partial<typeof scenes.$inferInsert> = {};
    if (patch.imagePath !== undefined) set.imagePath = patch.imagePath;
    if (patch.imageHash !== undefined) set.imageHash = patch.imageHash;
    if (patch.voicePath !== undefined) set.voicePath = patch.voicePath;
    if (patch.voiceSeconds !== undefined) set.voiceSeconds = patch.voiceSeconds;
    if (patch.voiceHash !== undefined) set.voiceHash = patch.voiceHash;
    if (patch.approved !== undefined) set.approved = patch.approved;
    if (!Object.keys(set).length) return;
    await orm().update(scenes).set(set).where(and(eq(scenes.id, sceneId), eq(scenes.episodeId, episodeId), scoped(scenes)));
    await episodeRepository.touch(episodeId);
  },
  async touch(id: string) {
    await orm().update(episodes).set({ updatedAt: now() }).where(thisEpisode(id));
  },
  async remove(id: string) {
    await orm().delete(episodes).where(thisEpisode(id));
  },
  async nextNumber(seriesId: string): Promise<number> {
    const r = await orm().select({ n: max(episodes.number) }).from(episodes).where(and(eq(episodes.seriesId, seriesId), scoped(episodes))).then(one);
    return (r?.n ?? 0) + 1;
  },
  /** Episode counts per status, by series (for series cards). */
  async countsBySeries(channelId: string): Promise<Map<string, Partial<Record<Episode['status'], number>>>> {
    const rows = await orm()
      .select({ s: episodes.seriesId, status: episodes.status, n: count() })
      .from(episodes)
      .where(and(eq(episodes.channelId, channelId), scoped(episodes), isNotNull(episodes.seriesId)))
      .groupBy(episodes.seriesId, episodes.status);
    const out = new Map<string, Partial<Record<Episode['status'], number>>>();
    for (const r of rows) out.set(r.s!, { ...out.get(r.s!), [r.status]: r.n });
    return out;
  },
  /** Assign episode numbers atomically (the series/number index is unique, so go through negative numbers). */
  async renumber(assignments: { id: string; number: number }[]) {
    await transaction(async () => {
      const setNumber = (id: string, number: number) => orm().update(episodes).set({ number, updatedAt: now() }).where(thisEpisode(id));
      for (const [i, a] of assignments.entries()) await setNumber(a.id, -(i + 1));
      for (const a of assignments) await setNumber(a.id, a.number);
    });
  },
  async renders(episodeId: string): Promise<Render[]> {
    return (await orm().select().from(renders).where(and(eq(renders.episodeId, episodeId), scoped(renders))).orderBy(asc(renders.format))).map(toRender);
  },
  async replaceRenders(episodeId: string, list: Omit<Render, 'id' | 'episodeId' | 'createdAt'>[]): Promise<Render[]> {
    await transaction(async () => {
      await orm().delete(renders).where(and(eq(renders.episodeId, episodeId), scoped(renders)));
      if (list.length) await orm().insert(renders).values(list.map((r) => ({ id: newId(), episodeId, format: r.format, filePath: r.filePath, thumbnailPath: r.thumbnailPath, durationSec: r.durationSec, createdAt: now(), ...owner() })));
    });
    return await episodeRepository.renders(episodeId);
  },
  async events(episodeId: string): Promise<EpisodeEvent[]> {
    return orm().select({ at: episodeEvents.at, message: episodeEvents.message }).from(episodeEvents).where(and(eq(episodeEvents.episodeId, episodeId), scoped(episodeEvents))).orderBy(asc(episodeEvents.id));
  },
  async addEvent(episodeId: string, message: string) {
    await orm().insert(episodeEvents).values({ episodeId, at: now(), message, ...owner() });
    await episodeRepository.touch(episodeId);
  },
};
