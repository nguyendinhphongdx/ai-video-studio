import { and, asc, desc, eq, inArray, like } from 'drizzle-orm';

import type { Job, JobKind } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { json, now, transaction } from '@/server/db';
import { orm, owner, scoped } from '@/server/orm';
import { jobs } from '@/server/schema';

type Row = typeof jobs.$inferSelect;

const toJob = (r: Row): Job => ({
  id: r.id,
  episodeId: r.episodeId,
  kind: r.kind as JobKind,
  payload: json<Record<string, unknown>>(r.payload, {}),
  state: r.state as Job['state'],
  progress: r.progress,
  phase: r.phase,
  error: r.error,
  result: json<unknown>(r.result, null),
  createdAt: r.createdAt,
  startedAt: r.startedAt,
  finishedAt: r.finishedAt,
});

const ACTIVE = ['queued', 'running'];
const thisJob = (id: string) => and(eq(jobs.id, id), scoped(jobs));
const scopeOf = (r: Row) => ({ job: toJob(r), workspaceId: r.workspaceId, userId: r.userId });

export const jobRepository = {
  async insert(episodeId: string | null, kind: JobKind, payload: Record<string, unknown>): Promise<Job> {
    const id = newId();
    await orm().insert(jobs).values({ id, episodeId, kind, payload: JSON.stringify(payload), state: 'queued', createdAt: now(), ...owner() });
    return (await jobRepository.find(id))!;
  },
  async find(id: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(thisJob(id)).get();
    return r ? toJob(r) : null;
  },
  async active(episodeId: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(and(eq(jobs.episodeId, episodeId), scoped(jobs), inArray(jobs.state, ACTIVE))).orderBy(desc(jobs.createdAt)).limit(1).get();
    return r ? toJob(r) : null;
  },
  async latest(episodeId: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(and(eq(jobs.episodeId, episodeId), scoped(jobs))).orderBy(desc(jobs.createdAt)).limit(1).get();
    return r ? toJob(r) : null;
  },
  /** The running or queued assistant turn of a conversation, if any. */
  async activeAssistant(threadId: string): Promise<Job | null> {
    const r = await orm()
      .select()
      .from(jobs)
      .where(and(eq(jobs.kind, 'assistant_turn'), scoped(jobs), inArray(jobs.state, ACTIVE), like(jobs.payload, `%"threadId":"${threadId}"%`)))
      .orderBy(desc(jobs.createdAt))
      .limit(1)
      .get();
    return r ? toJob(r) : null;
  },
  async listActive(): Promise<Job[]> {
    return (await orm().select().from(jobs).where(and(scoped(jobs), inArray(jobs.state, ACTIVE))).orderBy(asc(jobs.createdAt))).map(toJob);
  },
  async progress(id: string, progress: number, phase: string | null) {
    const set: Partial<Row> = { progress: Math.max(0, Math.min(1, progress)) };
    if (phase !== null) set.phase = phase;
    await orm().update(jobs).set(set).where(thisJob(id));
  },
  async finish(id: string, result?: unknown) {
    await orm().update(jobs).set({ state: 'done', progress: 1, result: result === undefined ? null : JSON.stringify(result), finishedAt: now() }).where(thisJob(id));
  },
  async fail(id: string, error: string) {
    await orm().update(jobs).set({ state: 'failed', error, finishedAt: now() }).where(thisJob(id));
  },
};

/**
 * The queue as the worker sees it: across every workspace, because one worker serves them all. The only unscoped job
 * reads; each claimed job then runs inside its own workspace scope (src/worker/index.ts).
 */
export const jobQueue = {
  /** Atomically take the oldest queued job, with the workspace and person it runs for. */
  async claimNext(): Promise<{ job: Job; workspaceId: string | null; userId: string | null } | null> {
    return await transaction(async () => {
      const r = await orm().select().from(jobs).where(eq(jobs.state, 'queued')).orderBy(asc(jobs.createdAt)).limit(1).get();
      if (!r) return null;
      const startedAt = now();
      await orm().update(jobs).set({ state: 'running', startedAt }).where(eq(jobs.id, r.id));
      return scopeOf({ ...r, state: 'running', startedAt });
    });
  },
  /** Jobs left 'running' by a worker that died, with their workspace and person, so each episode can be reset in its scope. */
  async failInterrupted(message: string): Promise<{ job: Job; workspaceId: string | null; userId: string | null }[]> {
    const rows = await orm().select().from(jobs).where(eq(jobs.state, 'running'));
    await orm().update(jobs).set({ state: 'failed', error: message, finishedAt: now() }).where(eq(jobs.state, 'running'));
    return rows.map(scopeOf);
  },
  /** A job that cannot run (its workspace is gone): fail it without a scope. */
  async failUnscoped(id: string, error: string) {
    await orm().update(jobs).set({ state: 'failed', error, finishedAt: now() }).where(eq(jobs.id, id));
  },
};
