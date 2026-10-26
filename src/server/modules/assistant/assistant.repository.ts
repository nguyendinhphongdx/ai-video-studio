import type { AssistantMessage, AssistantStore, AssistantThreadInfo } from '@/core/ports';
import { newId } from '@/core/domain/ids';
import { notFound } from '@/server/http/api-error';
import { db, json, now } from '@/server/db';

type Row = Record<string, unknown>;

export interface AssistantThread extends AssistantThreadInfo {
  createdAt: string;
  updatedAt: string;
}

const toThread = (r: Row): AssistantThread => ({ id: String(r.id), channelId: String(r.channel_id), title: String(r.title), mode: String(r.mode) as AssistantThread['mode'], createdAt: String(r.created_at), updatedAt: String(r.updated_at) });

const toMessage = (r: Row): AssistantMessage => ({
  id: Number(r.id),
  threadId: String(r.thread_id),
  role: String(r.role) as AssistantMessage['role'],
  content: String(r.content),
  toolCalls: json(r.tool_calls, []),
  toolCallId: (r.tool_call_id as string | null) ?? null,
  toolName: (r.tool_name as string | null) ?? null,
  status: String(r.status) as AssistantMessage['status'],
  summary: String(r.summary),
  data: json(r.data, null),
  focus: json(r.focus, null),
  createdAt: String(r.created_at),
});

export const assistantRepository = {
  threads(channelId: string): AssistantThread[] {
    return (db().prepare('SELECT * FROM assistant_threads WHERE channel_id = ? ORDER BY updated_at DESC').all(channelId) as Row[]).map(toThread);
  },
  find(id: string): AssistantThread | null {
    const r = db().prepare('SELECT * FROM assistant_threads WHERE id = ?').get(id) as Row | undefined;
    return r ? toThread(r) : null;
  },
  insertThread(channelId: string, mode: AssistantThread['mode']): AssistantThread {
    const id = newId();
    const ts = now();
    db().prepare('INSERT INTO assistant_threads (id, channel_id, title, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, channelId, '', mode, ts, ts);
    return assistantRepository.find(id)!;
  },
  updateThread(id: string, patch: Partial<Pick<AssistantThread, 'title' | 'mode'>>) {
    if (patch.title !== undefined) db().prepare('UPDATE assistant_threads SET title = ?, updated_at = ? WHERE id = ?').run(patch.title, now(), id);
    if (patch.mode !== undefined) db().prepare('UPDATE assistant_threads SET mode = ?, updated_at = ? WHERE id = ?').run(patch.mode, now(), id);
  },
  removeThread(id: string) {
    db().prepare('DELETE FROM assistant_threads WHERE id = ?').run(id);
  },
  messages(threadId: string): AssistantMessage[] {
    return (db().prepare('SELECT * FROM assistant_messages WHERE thread_id = ? ORDER BY id').all(threadId) as Row[]).map(toMessage);
  },
  append(threadId: string, m: Omit<AssistantMessage, 'id' | 'threadId' | 'createdAt'>): AssistantMessage {
    const r = db()
      .prepare('INSERT INTO assistant_messages (thread_id, role, content, tool_calls, tool_call_id, tool_name, status, summary, data, focus, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(threadId, m.role, m.content, JSON.stringify(m.toolCalls), m.toolCallId, m.toolName, m.status, m.summary, m.data === null || m.data === undefined ? null : JSON.stringify(m.data), m.focus ? JSON.stringify(m.focus) : null, now());
    db().prepare('UPDATE assistant_threads SET updated_at = ? WHERE id = ?').run(now(), threadId);
    return toMessage(db().prepare('SELECT * FROM assistant_messages WHERE id = ?').get(Number(r.lastInsertRowid)) as Row);
  },
  update(id: number, patch: Partial<Pick<AssistantMessage, 'content' | 'status' | 'summary' | 'data'>>) {
    if (patch.content !== undefined) db().prepare('UPDATE assistant_messages SET content = ? WHERE id = ?').run(patch.content, id);
    if (patch.status !== undefined) db().prepare('UPDATE assistant_messages SET status = ? WHERE id = ?').run(patch.status, id);
    if (patch.summary !== undefined) db().prepare('UPDATE assistant_messages SET summary = ? WHERE id = ?').run(patch.summary, id);
    if (patch.data !== undefined) db().prepare('UPDATE assistant_messages SET data = ? WHERE id = ?').run(patch.data === null ? null : JSON.stringify(patch.data), id);
  },
};

export const assistantStore: AssistantStore = {
  async thread(id) {
    const t = assistantRepository.find(id);
    if (!t) throw notFound('cuộc trò chuyện');
    return t;
  },
  async messages(threadId) {
    return assistantRepository.messages(threadId);
  },
  async append(threadId, m) {
    return assistantRepository.append(threadId, m);
  },
  async update(id, patch) {
    assistantRepository.update(id, patch);
  },
};
