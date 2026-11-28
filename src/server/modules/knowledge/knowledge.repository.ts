import { and, desc, eq } from 'drizzle-orm';

import { now } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { announced } from '@/server/modules/changes/changes.repository';
import { channelKnowledgeVersions as versions } from '@/server/schema';

export interface KnowledgeVersion {
  channelId: string;
  version: number;
  markdown: string;
  note: string;
  createdAt: string;
}

const toVersion = (r: typeof versions.$inferSelect): KnowledgeVersion => ({ channelId: r.channelId, version: r.version, markdown: r.markdown, note: r.note, createdAt: r.createdAt });
const ofChannel = (channelId: string) => and(eq(versions.channelId, channelId), scoped(versions));

/** Knowledge versions are immutable; the latest one is the channel's current knowledge. */
export const knowledgeRepository = {
  async latest(channelId: string): Promise<KnowledgeVersion | null> {
    const r = await orm().select().from(versions).where(ofChannel(channelId)).orderBy(desc(versions.version)).limit(1).then(one);
    return r ? toVersion(r) : null;
  },
  async find(channelId: string, version: number): Promise<KnowledgeVersion | null> {
    const r = await orm().select().from(versions).where(and(ofChannel(channelId), eq(versions.version, version))).then(one);
    return r ? toVersion(r) : null;
  },
  async list(channelId: string): Promise<KnowledgeVersion[]> {
    return (await orm().select().from(versions).where(ofChannel(channelId)).orderBy(desc(versions.version))).map(toVersion);
  },
  async insert(channelId: string, markdown: string, note: string): Promise<KnowledgeVersion> {
    const next = ((await knowledgeRepository.latest(channelId))?.version ?? 0) + 1;
    const createdAt = now();
    await announced('knowledge', channelId, {}, async () => void (await orm().insert(versions).values({ channelId, version: next, markdown, note, createdAt, ...owner() })));
    return { channelId, version: next, markdown, note, createdAt };
  },
};
