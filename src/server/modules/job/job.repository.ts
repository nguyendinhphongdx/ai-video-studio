import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Job, JobKind } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { maybeCtx } from '@/server/context';
import { json, now, transaction } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { changesRepository } from '@/server/modules/changes/changes.repository';
import { PHASE_MAX } from '@/server/modules/changes/changes.types';
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

/** What a tab needs to follow a job without asking for it (docs/conventions/10-live-updates.md): ids, state, progress. */
const signalOf = (r: Row) => {
  const payload = json<Record<string, unknown>>(r.payload, {});
  const text = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : undefined);
  return {
    state: r.state,
    progress: r.progress,
    phase: r.phase ? r.phase.slice(0, PHASE_MAX) : null,
    kind: r.kind,
    episodeId: r.episodeId,
    ...(text('channelId') ? { channelId: text('channelId') } : {}),
    ...(text('seriesId') ? { seriesId: text('seriesId') } : {}),
    ...(text('threadId') ? { threadId: text('threadId') } : {}),
  };
};

/** Progress is announced at most once a second per job, and at once when the step changes. */
const lastProgress = new Map<string, { at: number; phase: string | null }>();
const worthAnnouncing = (id: string, phase: string | null) => {
  const last = lastProgress.get(id);
  if (last && last.phase === phase && Date.now() - last.at < 1000) return false;
  lastProgress.set(id, { at: Date.now(), phase });
  return true;
};
const thisJob = (id: string) => and(eq(jobs.id, id), scoped(jobs));
const scopeOf = (r: Row) => ({ job: toJob(r), workspaceId: r.workspaceId, userId: r.userId });

/** Only jobs that produce data (not an episode change) keep what their handler returned. */
const KEEPS_RESULT = new Set<Job['kind']>(['generate_sprites', 'generate_art']);
export const keptResult = (kind: Job['kind'], result: unknown) => (KEEPS_RESULT.has(kind) ? result : undefined);

export const jobRepository = {
  async insert(episodeId: string | null, kind: JobKind, payload: Record<string, unknown>): Promise<Job> {
    const id = newId();
    // Where this request came from, not where a retried job once did.
    const { via: _before, ...rest } = payload;
    const via = maybeCtx()?.usage.via;
    await transaction(async () => {
      const [row] = await orm().insert(jobs).values({ id, episodeId, kind, payload: JSON.stringify(via ? { ...rest, via } : rest), state: 'queued', createdAt: now(), ...owner() }).returning();
      await changesRepository.add('job', id, signalOf(row!));
    });
    return (await jobRepository.find(id))!;
  },
  async find(id: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(thisJob(id)).then(one);
    return r ? toJob(r) : null;
  },
  async active(episodeId: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(and(eq(jobs.episodeId, episodeId), scoped(jobs), inArray(jobs.state, ACTIVE))).orderBy(desc(jobs.createdAt)).limit(1).then(one);
    return r ? toJob(r) : null;
  },
  async latest(episodeId: string): Promise<Job | null> {
    const r = await orm().select().from(jobs).where(and(eq(jobs.episodeId, episodeId), scoped(jobs))).orderBy(desc(jobs.createdAt)).limit(1).then(one);
    return r ? toJob(r) : null;
  },
  /** The running or queued assistant turn of a conversation, if any. */
  async activeAssistant(threadId: string): Promise<Job | null> {
    const r = await orm()
      .select()
      .from(jobs)
      .where(and(eq(jobs.kind, 'assistant_turn'), scoped(jobs), inArray(jobs.state, ACTIVE), eq(sql`${jobs.payload}->>'threadId'`, threadId)))
      .orderBy(desc(jobs.createdAt))
      .limit(1)
      .then(one);
    return r ? toJob(r) : null;
  },
  /** The newest logo drawing of a project: how it is going, and the draft it made. */
  async latestLogo(channelId: string): Promise<Job | null> {
    const r = await orm()
      .select()
      .from(jobs)
      .where(and(eq(jobs.kind, 'generate_art'), scoped(jobs), eq(sql`${jobs.payload}->>'channelId'`, channelId), eq(sql`${jobs.payload}->>'kind'`, 'logo')))
      .orderBy(desc(jobs.createdAt))
      .limit(1)
      .then(one);
    return r ? toJob(r) : null;
  },
  async listActive(): Promise<Job[]> {
    return (await orm().select().from(jobs).where(and(scoped(jobs), inArray(jobs.state, ACTIVE))).orderBy(asc(jobs.createdAt))).map(toJob);
  },
  async progress(id: string, progress: number, phase: string | null) {
    const set: Partial<Row> = { progress: Math.max(0, Math.min(1, progress)) };
    if (phase !== null) set.phase = phase;
    await transaction(async () => {
      const [row] = await orm().update(jobs).set(set).where(thisJob(id)).returning();
      if (row && worthAnnouncing(id, row.phase)) await changesRepository.add('job', id, signalOf(row));
    });
  },
  async finish(id: string, result?: unknown) {
    lastProgress.delete(id);
    await transaction(async () => {
      const [row] = await orm().update(jobs).set({ state: 'done', progress: 1, result: result === undefined ? null : JSON.stringify(result), finishedAt: now() }).where(thisJob(id)).returning();
      if (row) await changesRepository.add('job', id, signalOf(row));
    });
  },
  async fail(id: string, error: string) {
    lastProgress.delete(id);
    await transaction(async () => {
      const [row] = await orm().update(jobs).set({ state: 'failed', error, finishedAt: now() }).where(thisJob(id)).returning();
      if (row) await changesRepository.add('job', id, signalOf(row));
    });
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
      // SKIP LOCKED: two workers never take the same job, and neither waits for the other.
      const r = await orm().select().from(jobs).where(eq(jobs.state, 'queued')).orderBy(asc(jobs.createdAt)).limit(1).for('update', { skipLocked: true }).then(one);
      if (!r) return null;
      const startedAt = now();
      await orm().update(jobs).set({ state: 'running', startedAt }).where(eq(jobs.id, r.id));
      const claimed = { ...r, state: 'running', startedAt };
      // The queue runs with no request scope: the signal carries the job's own workspace.
      await changesRepository.addFor(claimed, 'job', r.id, signalOf(claimed));
      return scopeOf(claimed);
    });
  },
  /** Jobs left 'running' by a worker that died, with their workspace and person, so each episode can be reset in its scope. */
  async failInterrupted(message: string): Promise<{ job: Job; workspaceId: string | null; userId: string | null }[]> {
    return await transaction(async () => {
      const rows = await orm().update(jobs).set({ state: 'failed', error: message, finishedAt: now() }).where(eq(jobs.state, 'running')).returning();
      for (const r of rows) await changesRepository.addFor(r, 'job', r.id, signalOf(r));
      return rows.map(scopeOf);
    });
  },
  /** A job that cannot run (its workspace is gone): fail it without a scope. */
  async failUnscoped(id: string, error: string) {
    await orm().update(jobs).set({ state: 'failed', error, finishedAt: now() }).where(eq(jobs.id, id));
  },
};
