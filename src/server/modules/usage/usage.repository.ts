import { newId } from '@/core/domain/ids';
import type { PriceRow, UsageKind } from '@/core/usage/cost';
import { and, asc, desc, eq, gte, isNull, lt, sql, type SQL } from 'drizzle-orm';

import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { maybeCtx } from '@/server/context';
import { transaction } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { budgets, priceBook, usageEvents as ev, workspacePrefs } from '@/server/schema';

export interface UsageEvent {
  id: string;
  at: string;
  kind: UsageKind;
  provider: string;
  model: string;
  purpose: string;
  channelId: string | null;
  seriesId: string | null;
  episodeId: string | null;
  sceneId: string | null;
  jobId: string | null;
  threadId: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  units: number;
  costUsd: number | null;
  estimated: boolean;
  durationMs: number;
}

export interface Budget {
  id: string;
  scope: 'global' | 'channel';
  channelId: string | null;
  period: 'day' | 'month';
  limitUsd: number;
  mode: 'warn' | 'block';
  alertPct: number;
}

const toEvent = (r: typeof ev.$inferSelect): UsageEvent => ({
  id: r.id, at: r.at, kind: r.kind as UsageKind, provider: r.provider, model: r.model, purpose: r.purpose,
  channelId: r.channelId, seriesId: r.seriesId, episodeId: r.episodeId, sceneId: r.sceneId, jobId: r.jobId, threadId: r.threadId,
  inputTokens: r.inputTokens, outputTokens: r.outputTokens, cachedTokens: r.cachedTokens, units: r.units,
  costUsd: r.costUsd, estimated: r.estimated, durationMs: r.durationMs,
});
const toPrice = (r: typeof priceBook.$inferSelect): PriceRow => ({ id: r.id, kind: r.kind as UsageKind, provider: r.provider, pattern: r.pattern, inputPerMtok: r.inputPerMtok, outputPerMtok: r.outputPerMtok, cachedPerMtok: r.cachedPerMtok, perUnit: r.perUnit, note: r.note });
const toBudget = (r: typeof budgets.$inferSelect): Budget => ({ id: r.id, scope: r.scope as Budget['scope'], channelId: r.channelId, period: r.period as Budget['period'], limitUsd: r.limitUsd, mode: r.mode as Budget['mode'], alertPct: r.alertPct });

export interface Totals {
  calls: number;
  usd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  images: number;
  ttsSeconds: number;
  unpriced: number;
  estimated: number;
}

export interface Group {
  key: string | null;
  kind: UsageKind | null;
  provider: string | null;
  calls: number;
  usd: number;
  inputTokens: number;
  outputTokens: number;
  units: number;
}

/** Sums that SQLite returns as numbers (COALESCE keeps an empty range at 0). */
const total = (col: SQL | AnyPgColumn) => sql<number>`COALESCE(SUM(${col}), 0)`.mapWith(Number);
const SUMS = { calls: sql<number>`COUNT(*)`.mapWith(Number), usd: total(ev.costUsd), i: total(ev.inputTokens), o: total(ev.outputTokens), c: total(ev.cachedTokens), units: total(ev.units) };
const toGroup = (r: { calls: number; usd: number; i: number; o: number; units: number }, key: string | null, kind: UsageKind | null = null, provider: string | null = null): Group => ({ key, kind, provider, calls: r.calls, usd: r.usd, inputTokens: r.i, outputTokens: r.o, units: r.units });
/** This workspace's events since `from`, optionally of one channel. */
const since = (from: string, channelId?: string | null) => and(scoped(ev), gte(ev.at, from), channelId ? eq(ev.channelId, channelId) : undefined);
const GROUP_COLUMN = { channel_id: ev.channelId, purpose: ev.purpose, episode_id: ev.episodeId } as const;
const USAGE_PREF = (key: string) => and(scoped(workspacePrefs), eq(workspacePrefs.key, `usage:${key}`));

export const usageRepository = {
  async insert(e: Omit<UsageEvent, 'id'> & { runId?: string | null }): Promise<string> {
    const id = newId();
    await orm()
      .insert(ev)
      .values({
        id, at: e.at, kind: e.kind, provider: e.provider, model: e.model, purpose: e.purpose, channelId: e.channelId, seriesId: e.seriesId, episodeId: e.episodeId, sceneId: e.sceneId, jobId: e.jobId,
        threadId: e.threadId, runId: e.runId ?? null, inputTokens: e.inputTokens, outputTokens: e.outputTokens, cachedTokens: e.cachedTokens, units: e.units, costUsd: e.costUsd, estimated: e.estimated,
        durationMs: e.durationMs, ...owner(),
      });
    return id;
  },

  async totals(from: string, channelId?: string): Promise<Totals> {
    const r = (await orm()
      .select({
        ...SUMS,
        images: total(sql`CASE WHEN ${ev.kind} = 'image' THEN ${ev.units} END`),
        secs: total(sql`CASE WHEN ${ev.kind} = 'tts' THEN ${ev.units} END`),
        unpriced: total(sql`CASE WHEN ${ev.costUsd} IS NULL THEN 1 ELSE 0 END`),
        est: total(sql`CASE WHEN ${ev.estimated} THEN 1 ELSE 0 END`),
      })
      .from(ev)
      .where(since(from, channelId))
      .then(one))!;
    return { calls: r.calls, usd: r.usd, inputTokens: r.i, outputTokens: r.o, cachedTokens: r.c, images: r.images, ttsSeconds: r.secs, unpriced: r.unpriced, estimated: r.est };
  },

  async daily(from: string): Promise<{ day: string; kind: UsageKind; usd: number }[]> {
    // The day in the server's time zone (the connection's TimeZone, set from the process in db.ts).
    const day = sql<string>`to_char(${ev.at}::timestamptz, 'YYYY-MM-DD')`;
    const rows = await orm().select({ day, kind: ev.kind, usd: total(ev.costUsd) }).from(ev).where(since(from)).groupBy(day, ev.kind).orderBy(day);
    return rows.map((r) => ({ day: r.day, kind: r.kind as UsageKind, usd: r.usd }));
  },

  async by(column: 'channel_id' | 'purpose' | 'episode_id', from: string, limit = 10): Promise<Group[]> {
    const col = GROUP_COLUMN[column];
    const rows = await orm().select({ k: col, ...SUMS }).from(ev).where(since(from)).groupBy(col).orderBy(desc(SUMS.usd), desc(SUMS.calls)).limit(limit);
    return rows.map((r) => toGroup(r, r.k));
  },

  async byModel(from: string): Promise<Group[]> {
    const rows = await orm().select({ kind: ev.kind, provider: ev.provider, k: ev.model, ...SUMS }).from(ev).where(since(from)).groupBy(ev.kind, ev.provider, ev.model).orderBy(desc(SUMS.usd), desc(SUMS.calls));
    return rows.map((r) => toGroup(r, r.k, r.kind as UsageKind, r.provider));
  },

  async events(filter: { from?: string; before?: string; kind?: UsageKind; channelId?: string; episodeId?: string; limit: number }): Promise<UsageEvent[]> {
    const where = and(
      scoped(ev),
      filter.from ? gte(ev.at, filter.from) : undefined,
      filter.before ? lt(ev.at, filter.before) : undefined,
      filter.kind ? eq(ev.kind, filter.kind) : undefined,
      filter.channelId ? eq(ev.channelId, filter.channelId) : undefined,
      filter.episodeId ? eq(ev.episodeId, filter.episodeId) : undefined,
    );
    return (await orm().select().from(ev).where(where).orderBy(desc(ev.at)).limit(filter.limit)).map(toEvent);
  },

  async spent(from: string, channelId: string | null): Promise<number> {
    return (await orm().select({ usd: total(ev.costUsd) }).from(ev).where(since(from, channelId)).then(one))?.usd ?? 0;
  },

  /** The system price book (workspace_id NULL), which the admin edits. */
  async prices(): Promise<PriceRow[]> {
    return (await orm().select().from(priceBook).where(isNull(priceBook.workspaceId)).orderBy(asc(priceBook.kind), asc(priceBook.provider), asc(priceBook.pattern))).map(toPrice);
  },
  async replacePrices(rows: Omit<PriceRow, 'id'>[]) {
    const by = maybeCtx()?.userId ?? null;
    await transaction(async () => {
      await orm().delete(priceBook).where(isNull(priceBook.workspaceId));
      if (rows.length) await orm().insert(priceBook).values(rows.map((r) => ({ ...r, workspaceId: null, userId: by })));
    });
  },

  async budgets(): Promise<Budget[]> {
    return (await orm().select().from(budgets).where(scoped(budgets)).orderBy(asc(budgets.createdAt))).map(toBudget);
  },
  async upsertBudget(b: Omit<Budget, 'id'> & { id?: string }, at: string): Promise<string> {
    const id = b.id ?? newId();
    const fields = { scope: b.scope, channelId: b.channelId, period: b.period, limitUsd: b.limitUsd, mode: b.mode, alertPct: b.alertPct };
    const thisBudget = and(eq(budgets.id, id), scoped(budgets));
    if (await orm().select({ id: budgets.id }).from(budgets).where(thisBudget).then(one)) await orm().update(budgets).set(fields).where(thisBudget);
    else await orm().insert(budgets).values({ id, ...fields, createdAt: at, ...owner() });
    return id;
  },
  async removeBudget(id: string) {
    await orm().delete(budgets).where(and(eq(budgets.id, id), scoped(budgets)));
  },

  async pref(key: string): Promise<string | null> {
    return (await orm().select({ value: workspacePrefs.value }).from(workspacePrefs).where(USAGE_PREF(key)).then(one))?.value ?? null;
  },
  async setPref(key: string, value: string) {
    const by = owner();
    await orm().insert(workspacePrefs).values({ ...by, key: `usage:${key}`, value }).onConflictDoUpdate({ target: [workspacePrefs.workspaceId, workspacePrefs.key], set: { value, userId: by.userId } });
  },
};
