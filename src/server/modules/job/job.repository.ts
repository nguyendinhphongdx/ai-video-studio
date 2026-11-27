import type { Job, JobKind } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { db, json, now, transaction } from '@/server/db';
import { uid, ws } from '@/server/http/scope';

type Row = Record<string, unknown>;

const toJob = (r: Row): Job => ({
  id: String(r.id),
  episodeId: (r.episode_id as string | null) ?? null,
  kind: String(r.kind) as JobKind,
  payload: json<Record<string, unknown>>(r.payload, {}),
  state: String(r.state) as Job['state'],
  progress: Number(r.progress),
  phase: (r.phase as string | null) ?? null,
  error: (r.error as string | null) ?? null,
  result: json<unknown>(r.result, null),
  createdAt: String(r.created_at),
  startedAt: (r.started_at as string | null) ?? null,
  finishedAt: (r.finished_at as string | null) ?? null,
});

export const jobRepository = {
  insert(episodeId: string | null, kind: JobKind, payload: Record<string, unknown>): Job {
    const id = newId();
    db()
      .prepare(`INSERT INTO jobs (id, episode_id, kind, payload, state, created_at, workspace_id, user_id) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)`)
      .run(id, episodeId, kind, JSON.stringify(payload), now(), ws(), uid());
    return jobRepository.find(id)!;
  },
  find(id: string): Job | null {
    const r = db().prepare('SELECT * FROM jobs WHERE id = ? AND workspace_id = ?').get(id, ws()) as Row | undefined;
    return r ? toJob(r) : null;
  },
  active(episodeId: string): Job | null {
    const r = db().prepare(`SELECT * FROM jobs WHERE episode_id = ? AND workspace_id = ? AND state IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1`).get(episodeId, ws()) as Row | undefined;
    return r ? toJob(r) : null;
  },
  latest(episodeId: string): Job | null {
    const r = db().prepare('SELECT * FROM jobs WHERE episode_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1').get(episodeId, ws()) as Row | undefined;
    return r ? toJob(r) : null;
  },
  /** The running or queued assistant turn of a conversation, if any. */
  activeAssistant(threadId: string): Job | null {
    const r = db().prepare(`SELECT * FROM jobs WHERE kind = 'assistant_turn' AND workspace_id = ? AND state IN ('queued', 'running') AND payload LIKE ? ORDER BY created_at DESC LIMIT 1`).get(ws(), `%"threadId":"${threadId}"%`) as Row | undefined;
    return r ? toJob(r) : null;
  },
  listActive(): Job[] {
    return (db().prepare(`SELECT * FROM jobs WHERE workspace_id = ? AND state IN ('queued', 'running') ORDER BY created_at`).all(ws()) as Row[]).map(toJob);
  },
  progress(id: string, progress: number, phase: string | null) {
    db().prepare('UPDATE jobs SET progress = ?, phase = COALESCE(?, phase) WHERE id = ? AND workspace_id = ?').run(Math.max(0, Math.min(1, progress)), phase, id, ws());
  },
  finish(id: string, result?: unknown) {
    db().prepare(`UPDATE jobs SET state = 'done', progress = 1, result = ?, finished_at = ? WHERE id = ? AND workspace_id = ?`).run(result === undefined ? null : JSON.stringify(result), now(), id, ws());
  },
  fail(id: string, error: string) {
    db().prepare(`UPDATE jobs SET state = 'failed', error = ?, finished_at = ? WHERE id = ? AND workspace_id = ?`).run(error, now(), id, ws());
  },
};

/**
 * The queue as the worker sees it: across every workspace, because one worker serves them all. The only unscoped job
 * reads; each claimed job then runs inside its own workspace scope (src/worker/index.ts).
 */
export const jobQueue = {
  /** Atomically take the oldest queued job, with the workspace and person it runs for. */
  claimNext(): { job: Job; workspaceId: string | null; userId: string | null } | null {
    return transaction(() => {
      const r = db().prepare(`SELECT * FROM jobs WHERE state = 'queued' ORDER BY created_at LIMIT 1`).get() as Row | undefined;
      if (!r) return null;
      db().prepare(`UPDATE jobs SET state = 'running', started_at = ? WHERE id = ?`).run(now(), String(r.id));
      return { job: toJob({ ...r, state: 'running' }), workspaceId: (r.workspace_id as string | null) ?? null, userId: (r.user_id as string | null) ?? null };
    });
  },
  /** Jobs left 'running' by a worker that died, with their workspace and person, so each episode can be reset in its scope. */
  failInterrupted(message: string): { job: Job; workspaceId: string | null; userId: string | null }[] {
    const rows = db().prepare(`SELECT * FROM jobs WHERE state = 'running'`).all() as Row[];
    db().prepare(`UPDATE jobs SET state = 'failed', error = ?, finished_at = ? WHERE state = 'running'`).run(message, now());
    return rows.map((r) => ({ job: toJob(r), workspaceId: (r.workspace_id as string | null) ?? null, userId: (r.user_id as string | null) ?? null }));
  },
  /** A job that cannot run (its workspace is gone): fail it without a scope. */
  failUnscoped(id: string, error: string) {
    db().prepare(`UPDATE jobs SET state = 'failed', error = ?, finished_at = ? WHERE id = ?`).run(error, now(), id);
  },
};
