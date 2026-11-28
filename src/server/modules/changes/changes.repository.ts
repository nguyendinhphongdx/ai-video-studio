import { and, asc, eq, gt, gte, lt, sql } from 'drizzle-orm';

import { json, now, transaction } from '@/server/db';
import { orm, owner } from '@/server/orm';
import { changes } from '@/server/schema';

import type { Signal, Topic } from './changes.types';

type Row = typeof changes.$inferSelect;

export interface StoredSignal extends Signal {
  workspaceId: string | null;
}

const toSignal = (r: Row): StoredSignal => ({ id: r.id, topic: r.topic as Topic, ref: r.ref, data: json<Record<string, unknown>>(r.data, {}), workspaceId: r.workspaceId });

/** Rows older than this are deleted. */
export const KEEP_MS = 24 * 60 * 60 * 1000;

export const changesRepository = {
  /** Announce a change in the current workspace. Call it in the same `transaction()` as the write it announces. */
  async add(topic: Topic, ref: string, data: Record<string, unknown> = {}) {
    await orm().insert(changes).values({ topic, ref, data: JSON.stringify(data), at: now(), ...owner() });
  },
  /** The same, for the places that run with no request scope (the queue claiming a job): the scope is given. */
  async addFor(scope: { workspaceId: string | null; userId: string | null }, topic: Topic, ref: string, data: Record<string, unknown> = {}) {
    await orm().insert(changes).values({ topic, ref, data: JSON.stringify(data), at: now(), workspaceId: scope.workspaceId, userId: scope.userId });
  },

  // The next three read across workspaces: the feed serves every tab of every workspace from one loop and filters
  // each row to its own workspace before sending (AGENTS.md rule 9, 0006).
  /** Rows written at or after a moment, oldest id first. */
  async since(atIso: string, limit = 500): Promise<StoredSignal[]> {
    return (await orm().select().from(changes).where(gte(changes.at, atIso)).orderBy(asc(changes.id)).limit(limit)).map(toSignal);
  },
  /** One workspace's rows after an id: what a tab that reconnects missed. */
  async after(workspaceId: string, id: number, limit = 500): Promise<StoredSignal[]> {
    return (await orm().select().from(changes).where(and(eq(changes.workspaceId, workspaceId), gt(changes.id, id))).orderBy(asc(changes.id)).limit(limit)).map(toSignal);
  },
  /** The smallest id still kept (null when nothing is): an id below it has lost rows. */
  async firstId(): Promise<number | null> {
    const r = await orm().select({ id: sql<number | null>`min(${changes.id})` }).from(changes);
    return r[0]?.id ?? null;
  },
  async prune(olderThanMs = KEEP_MS): Promise<void> {
    await orm().delete(changes).where(lt(changes.at, new Date(Date.now() - olderThanMs).toISOString()));
  },
};

/** A write and the announcement of it in one transaction: either both happen or neither. */
export async function announced<T>(topic: Topic, ref: string, data: Record<string, unknown>, write: () => Promise<T>): Promise<T> {
  return await transaction(async () => {
    const result = await write();
    await changesRepository.add(topic, ref, data);
    return result;
  });
}
