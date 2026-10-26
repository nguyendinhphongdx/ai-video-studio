import type { Job, JobKind } from '@/core/domain';
import { newId } from '@/core/domain/ids';
import { db, json, now, transaction } from '@/server/db';

type Row = Record<string, unknown>;

const toJob = (r: Row): Job => ({
  id: String(r.id),
  episodeId: String(r.episode_id),
  kind: String(r.kind) as JobKind,
  payload: json<Record<string, unknown>>(r.payload, {}),
  state: String(r.state) as Job['state'],
  progress: Number(r.progress),
  phase: (r.phase as string | null) ?? null,
  error: (r.error as string | null) ?? null,
  createdAt: String(r.created_at),
  startedAt: (r.started_at as string | null) ?? null,
  finishedAt: (r.finished_at as string | null) ?? null,
});

export const jobRepository = {
  insert(episodeId: string, kind: JobKind, payload: Record<string, unknown>): Job {
    const id = newId();
    db()
      .prepare(`INSERT INTO jobs (id, episode_id, kind, payload, state, created_at) VALUES (?, ?, ?, ?, 'queued', ?)`)
      .run(id, episodeId, kind, JSON.stringify(payload), now());
    return jobRepository.find(id)!;
  },
  find(id: string): Job | null {
    const r = db().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Row | undefined;
    return r ? toJob(r) : null;
  },
  active(episodeId: string): Job | null {
    const r = db().prepare(`SELECT * FROM jobs WHERE episode_id = ? AND state IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1`).get(episodeId) as Row | undefined;
    return r ? toJob(r) : null;
  },
  latest(episodeId: string): Job | null {
    const r = db().prepare('SELECT * FROM jobs WHERE episode_id = ? ORDER BY created_at DESC LIMIT 1').get(episodeId) as Row | undefined;
    return r ? toJob(r) : null;
  },
  /** Atomically take the oldest queued job. */
  claimNext(): Job | null {
    return transaction(() => {
      const r = db().prepare(`SELECT id FROM jobs WHERE state = 'queued' ORDER BY created_at LIMIT 1`).get() as { id: string } | undefined;
      if (!r) return null;
      db().prepare(`UPDATE jobs SET state = 'running', started_at = ? WHERE id = ?`).run(now(), r.id);
      return jobRepository.find(r.id);
    });
  },
  progress(id: string, progress: number, phase: string | null) {
    db().prepare('UPDATE jobs SET progress = ?, phase = COALESCE(?, phase) WHERE id = ?').run(Math.max(0, Math.min(1, progress)), phase, id);
  },
  finish(id: string) {
    db().prepare(`UPDATE jobs SET state = 'done', progress = 1, finished_at = ? WHERE id = ?`).run(now(), id);
  },
  fail(id: string, error: string) {
    db().prepare(`UPDATE jobs SET state = 'failed', error = ?, finished_at = ? WHERE id = ?`).run(error, now(), id);
  },
  /** Jobs left 'running' by a worker that died; returns them so their episodes can be reset. */
  failInterrupted(message: string): Job[] {
    const rows = (db().prepare(`SELECT * FROM jobs WHERE state = 'running'`).all() as Row[]).map(toJob);
    for (const j of rows) jobRepository.fail(j.id, message);
    return rows;
  },
};
