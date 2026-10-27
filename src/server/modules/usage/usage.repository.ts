import { newId } from '@/core/domain/ids';
import type { PriceRow, UsageKind } from '@/core/usage/cost';
import { db } from '@/server/db';

type Row = Record<string, unknown>;

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

const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const toEvent = (r: Row): UsageEvent => ({
  id: String(r.id), at: String(r.at), kind: r.kind as UsageKind, provider: String(r.provider), model: String(r.model), purpose: String(r.purpose),
  channelId: str(r.channel_id), seriesId: str(r.series_id), episodeId: str(r.episode_id), sceneId: str(r.scene_id), jobId: str(r.job_id), threadId: str(r.thread_id),
  inputTokens: Number(r.input_tokens), outputTokens: Number(r.output_tokens), cachedTokens: Number(r.cached_tokens), units: Number(r.units),
  costUsd: r.cost_usd === null ? null : Number(r.cost_usd), estimated: Number(r.estimated) === 1, durationMs: Number(r.duration_ms),
});
const toPrice = (r: Row): PriceRow => ({ id: Number(r.id), kind: r.kind as UsageKind, provider: str(r.provider), pattern: String(r.pattern), inputPerMtok: Number(r.input_per_mtok), outputPerMtok: Number(r.output_per_mtok), cachedPerMtok: Number(r.cached_per_mtok), perUnit: Number(r.per_unit), note: String(r.note) });
const toBudget = (r: Row): Budget => ({ id: String(r.id), scope: r.scope as Budget['scope'], channelId: str(r.channel_id), period: r.period as Budget['period'], limitUsd: Number(r.limit_usd), mode: r.mode as Budget['mode'], alertPct: Number(r.alert_pct) });

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

const SUMS = `COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS usd, COALESCE(SUM(input_tokens), 0) AS i, COALESCE(SUM(output_tokens), 0) AS o, COALESCE(SUM(cached_tokens), 0) AS c, COALESCE(SUM(units), 0) AS units`;
const toGroup = (r: Row, key: string | null, kind: UsageKind | null = null, provider: string | null = null): Group => ({ key, kind, provider, calls: Number(r.calls), usd: Number(r.usd), inputTokens: Number(r.i), outputTokens: Number(r.o), units: Number(r.units) });

export const usageRepository = {
  insert(e: Omit<UsageEvent, 'id'> & { runId?: string | null }): string {
    const id = newId();
    db()
      .prepare('INSERT INTO usage_events (id, at, kind, provider, model, purpose, channel_id, series_id, episode_id, scene_id, job_id, thread_id, run_id, input_tokens, output_tokens, cached_tokens, units, cost_usd, estimated, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, e.at, e.kind, e.provider, e.model, e.purpose, e.channelId, e.seriesId, e.episodeId, e.sceneId, e.jobId, e.threadId, e.runId ?? null, e.inputTokens, e.outputTokens, e.cachedTokens, e.units, e.costUsd, e.estimated ? 1 : 0, e.durationMs);
    return id;
  },

  totals(from: string, channelId?: string): Totals {
    const r = db()
      .prepare(`SELECT ${SUMS}, COALESCE(SUM(CASE WHEN kind = 'image' THEN units END), 0) AS images, COALESCE(SUM(CASE WHEN kind = 'tts' THEN units END), 0) AS secs, COALESCE(SUM(cost_usd IS NULL), 0) AS unpriced, COALESCE(SUM(estimated), 0) AS est FROM usage_events WHERE at >= ?${channelId ? ' AND channel_id = ?' : ''}`)
      .get(...(channelId ? [from, channelId] : [from])) as Row;
    return { calls: Number(r.calls), usd: Number(r.usd), inputTokens: Number(r.i), outputTokens: Number(r.o), cachedTokens: Number(r.c), images: Number(r.images), ttsSeconds: Number(r.secs), unpriced: Number(r.unpriced), estimated: Number(r.est) };
  },

  daily(from: string): { day: string; kind: UsageKind; usd: number }[] {
    return (db().prepare("SELECT date(at, 'localtime') AS d, kind, COALESCE(SUM(cost_usd), 0) AS usd FROM usage_events WHERE at >= ? GROUP BY d, kind ORDER BY d").all(from) as Row[]).map((r) => ({ day: String(r.d), kind: r.kind as UsageKind, usd: Number(r.usd) }));
  },

  by(column: 'channel_id' | 'purpose' | 'episode_id', from: string, limit = 10): Group[] {
    return (db().prepare(`SELECT ${column} AS k, ${SUMS} FROM usage_events WHERE at >= ? GROUP BY ${column} ORDER BY usd DESC, calls DESC LIMIT ?`).all(from, limit) as Row[]).map((r) => toGroup(r, str(r.k)));
  },

  byModel(from: string): Group[] {
    return (db().prepare(`SELECT kind, provider, model AS k, ${SUMS} FROM usage_events WHERE at >= ? GROUP BY kind, provider, model ORDER BY usd DESC, calls DESC`).all(from) as Row[]).map((r) => toGroup(r, String(r.k), r.kind as UsageKind, String(r.provider)));
  },

  events(filter: { from?: string; before?: string; kind?: UsageKind; channelId?: string; episodeId?: string; limit: number }): UsageEvent[] {
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (filter.from) (where.push('at >= ?'), args.push(filter.from));
    if (filter.before) (where.push('at < ?'), args.push(filter.before));
    if (filter.kind) (where.push('kind = ?'), args.push(filter.kind));
    if (filter.channelId) (where.push('channel_id = ?'), args.push(filter.channelId));
    if (filter.episodeId) (where.push('episode_id = ?'), args.push(filter.episodeId));
    return (db().prepare(`SELECT * FROM usage_events${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY at DESC LIMIT ?`).all(...args, filter.limit) as Row[]).map(toEvent);
  },

  spent(from: string, channelId: string | null): number {
    const r = db().prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS usd FROM usage_events WHERE at >= ?${channelId ? ' AND channel_id = ?' : ''}`).get(...(channelId ? [from, channelId] : [from])) as Row;
    return Number(r.usd);
  },

  prices(): PriceRow[] {
    return (db().prepare('SELECT * FROM price_book ORDER BY kind, provider, pattern').all() as Row[]).map(toPrice);
  },
  replacePrices(rows: Omit<PriceRow, 'id'>[]) {
    const d = db();
    d.exec('BEGIN');
    try {
      d.exec('DELETE FROM price_book');
      const ins = d.prepare('INSERT INTO price_book (kind, provider, pattern, input_per_mtok, output_per_mtok, cached_per_mtok, per_unit, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const r of rows) ins.run(r.kind, r.provider, r.pattern, r.inputPerMtok, r.outputPerMtok, r.cachedPerMtok, r.perUnit, r.note);
      d.exec('COMMIT');
    } catch (e) {
      d.exec('ROLLBACK');
      throw e;
    }
  },

  budgets(): Budget[] {
    return (db().prepare('SELECT * FROM budgets ORDER BY created_at').all() as Row[]).map(toBudget);
  },
  upsertBudget(b: Omit<Budget, 'id'> & { id?: string }, at: string): string {
    const id = b.id ?? newId();
    const has = db().prepare('SELECT 1 FROM budgets WHERE id = ?').get(id);
    if (has) db().prepare('UPDATE budgets SET scope = ?, channel_id = ?, period = ?, limit_usd = ?, mode = ?, alert_pct = ? WHERE id = ?').run(b.scope, b.channelId, b.period, b.limitUsd, b.mode, b.alertPct, id);
    else db().prepare('INSERT INTO budgets (id, scope, channel_id, period, limit_usd, mode, alert_pct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, b.scope, b.channelId, b.period, b.limitUsd, b.mode, b.alertPct, at);
    return id;
  },
  removeBudget(id: string) {
    db().prepare('DELETE FROM budgets WHERE id = ?').run(id);
  },

  pref(key: string): string | null {
    const r = db().prepare('SELECT value FROM usage_prefs WHERE key = ?').get(key) as Row | undefined;
    return r ? String(r.value) : null;
  },
  setPref(key: string, value: string) {
    db().prepare('INSERT INTO usage_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  },
};
