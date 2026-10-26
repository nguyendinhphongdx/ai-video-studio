import { db, now } from '@/server/db';

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
  latest(channelId: string): KnowledgeVersion | null {
    const r = db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? ORDER BY version DESC LIMIT 1').get(channelId) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  find(channelId: string, version: number): KnowledgeVersion | null {
    const r = db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? AND version = ?').get(channelId, version) as Row | undefined;
    return r ? toVersion(r) : null;
  },
  list(channelId: string): KnowledgeVersion[] {
    return (db().prepare('SELECT * FROM channel_knowledge_versions WHERE channel_id = ? ORDER BY version DESC').all(channelId) as Row[]).map(toVersion);
  },
  insert(channelId: string, markdown: string, note: string): KnowledgeVersion {
    const next = (knowledgeRepository.latest(channelId)?.version ?? 0) + 1;
    const createdAt = now();
    db().prepare('INSERT INTO channel_knowledge_versions (channel_id, version, markdown, note, created_at) VALUES (?, ?, ?, ?, ?)').run(channelId, next, markdown, note, createdAt);
    return { channelId, version: next, markdown, note, createdAt };
  },
};
