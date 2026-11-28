import { and, asc, desc, eq, gt } from 'drizzle-orm';

import type { AssistantEvent } from '@/core/assistant/stream';
import type { AssistantMessage, AssistantStore, AssistantThreadInfo } from '@/core/ports';
import { newId } from '@/core/domain/ids';
import { notFound } from '@/server/http/api-error';
import { json, now } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { assistantMessages as messages, assistantStreamEvents as events, assistantThreads as threads } from '@/server/schema';

export interface AssistantThread extends AssistantThreadInfo {
  createdAt: string;
  updatedAt: string;
}

const toThread = (r: typeof threads.$inferSelect): AssistantThread => ({ id: r.id, channelId: r.channelId, title: r.title, mode: r.mode as AssistantThread['mode'], createdAt: r.createdAt, updatedAt: r.updatedAt });

const toMessage = (r: typeof messages.$inferSelect): AssistantMessage => ({
  id: r.id,
  threadId: r.threadId,
  role: r.role as AssistantMessage['role'],
  content: r.content,
  toolCalls: json(r.toolCalls, []),
  toolCallId: r.toolCallId,
  toolName: r.toolName,
  status: r.status as AssistantMessage['status'],
  summary: r.summary,
  data: json(r.data, null),
  focus: json(r.focus, null),
  createdAt: r.createdAt,
});

const thisThread = (id: string) => and(eq(threads.id, id), scoped(threads));
const thisMessage = (id: number) => and(eq(messages.id, id), scoped(messages));

export const assistantRepository = {
  async threads(channelId: string): Promise<AssistantThread[]> {
    return (await orm().select().from(threads).where(and(eq(threads.channelId, channelId), scoped(threads))).orderBy(desc(threads.updatedAt))).map(toThread);
  },
  async find(id: string): Promise<AssistantThread | null> {
    const r = await orm().select().from(threads).where(thisThread(id)).then(one);
    return r ? toThread(r) : null;
  },
  async insertThread(channelId: string, mode: AssistantThread['mode']): Promise<AssistantThread> {
    const id = newId();
    const ts = now();
    await orm().insert(threads).values({ id, channelId, title: '', mode, createdAt: ts, updatedAt: ts, ...owner() });
    return (await assistantRepository.find(id))!;
  },
  async updateThread(id: string, patch: Partial<Pick<AssistantThread, 'title' | 'mode'>>) {
    const set: Partial<typeof threads.$inferInsert> = {};
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.mode !== undefined) set.mode = patch.mode;
    if (Object.keys(set).length) await orm().update(threads).set({ ...set, updatedAt: now() }).where(thisThread(id));
  },
  async removeThread(id: string) {
    await orm().delete(threads).where(thisThread(id));
  },
  async setStop(threadId: string, stop: boolean) {
    await orm().update(threads).set({ stopRequested: stop ? 1 : 0 }).where(thisThread(threadId));
  },
  async stopRequested(threadId: string): Promise<boolean> {
    return Boolean((await orm().select({ stop: threads.stopRequested }).from(threads).where(thisThread(threadId)).then(one))?.stop);
  },
  async addEvents(threadId: string, batch: AssistantEvent[]) {
    if (batch.length) await orm().insert(events).values(batch.map((e) => ({ threadId, event: JSON.stringify(e), ...owner() })));
  },
  /** Events after a position, oldest first. */
  async eventsAfter(threadId: string, position: number): Promise<{ position: number; event: string }[]> {
    return await orm().select({ position: events.id, event: events.event }).from(events).where(and(eq(events.threadId, threadId), gt(events.id, position), scoped(events))).orderBy(asc(events.id)).limit(500);
  },
  async clearEvents(threadId: string) {
    await orm().delete(events).where(and(eq(events.threadId, threadId), scoped(events)));
  },
  async messages(threadId: string): Promise<AssistantMessage[]> {
    return (await orm().select().from(messages).where(and(eq(messages.threadId, threadId), scoped(messages))).orderBy(asc(messages.id))).map(toMessage);
  },
  async append(threadId: string, m: Omit<AssistantMessage, 'id' | 'threadId' | 'createdAt'>): Promise<AssistantMessage> {
    const [row] = await orm()
      .insert(messages)
      .values({
        threadId, role: m.role, content: m.content, toolCalls: JSON.stringify(m.toolCalls), toolCallId: m.toolCallId, toolName: m.toolName, status: m.status, summary: m.summary,
        data: m.data === null || m.data === undefined ? null : JSON.stringify(m.data), focus: m.focus ? JSON.stringify(m.focus) : null, createdAt: now(), ...owner(),
      })
      .returning();
    await orm().update(threads).set({ updatedAt: now() }).where(thisThread(threadId));
    return toMessage(row!);
  },
  async update(id: number, patch: Partial<Pick<AssistantMessage, 'content' | 'status' | 'summary' | 'data'>>) {
    const set: Partial<typeof messages.$inferInsert> = {};
    if (patch.content !== undefined) set.content = patch.content;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.summary !== undefined) set.summary = patch.summary;
    if (patch.data !== undefined) set.data = patch.data === null ? null : JSON.stringify(patch.data);
    if (Object.keys(set).length) await orm().update(messages).set(set).where(thisMessage(id));
  },
};

export const assistantStore: AssistantStore = {
  async thread(id) {
    const t = await assistantRepository.find(id);
    if (!t) throw notFound('cuộc trò chuyện');
    return t;
  },
  async messages(threadId) {
    return await assistantRepository.messages(threadId);
  },
  async append(threadId, m) {
    return await assistantRepository.append(threadId, m);
  },
  async update(id, patch) {
    await assistantRepository.update(id, patch);
  },
};
