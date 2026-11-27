import { db, now } from '@/server/db';
import { ctx } from '@/server/context';

type Row = Record<string, unknown>;

export interface KnowledgeVersion {
  channelId: string;
  version: number;
  markdown: string;
  note: string;
  createdAt: string;
}

const toVersion = (r: Row): KnowledgeVersion => ({ channelId: String(r.channel_id), version: Number(r.version), markdown: String(r.markdown), note: String(r.note), createdAt: String(r.created_at) });

/** Knowledge versions are immutable; the latest one is the channel's current knowledge. */
export const knowledgeRepository = {
  async latest(channelId: string): Promise<KnowledgeVersion | null> {
    const r = db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? AND workspace_id = ? ORDER BY version DESC LIMIT 1').get(channelId, ctx().workspaceId) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  async find(channelId: string, version: number): Promise<KnowledgeVersion | null> {
    const r = db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? AND version = ? AND workspace_id = ?').get(channelId, version, ctx().workspaceId) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  async list(channelId: string): Promise<KnowledgeVersion[]> {
    return (db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? AND workspace_id = ? ORDER BY version DESC').all(channelId, ctx().workspaceId) as Row[]).map(toVersion);
  },
  async insert(channelId: string, markdown: string, note: string): Promise<KnowledgeVersion> {
    const next = ((await knowledgeRepository.latest(channelId))?.version ?? 0) + 1;
    const createdAt = now();
    db().prepare('INSERT INTO channel_knowledge_versions (channel_id, version, markdown, note, created_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(channelId, next, markdown, note, createdAt, ctx().workspaceId, ctx().userId);
    return { channelId, version: next, markdown, note, createdAt };
  },
};
