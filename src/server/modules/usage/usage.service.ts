import { UserFacingError } from '@/core/domain/errors';
import { estimateSpeechSec } from '@/core/timeline';
import { costOf, pickPrice, TTS_TOKENS_PER_SECOND, estimateTokens, type PriceRow, type Usage, type UsageKind } from '@/core/usage/cost';
import { periodStart, rangeStart, type UsageRange } from '@/core/usage/period';
import { isGoogleVoice } from '@/core/domain/catalog';
import { GEMINI_TTS_MODEL } from '@/server/config';
import { now } from '@/server/db';
import { notFound } from '@/server/http/api-error';
import { createLogger } from '@/server/logger';
import { channelRepository } from '@/server/modules/channel/channel.repository';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { settingsService } from '@/server/modules/settings/settings.service';

import { DEFAULT_PRICES } from './pricing';
import { usageRepository, type Budget, type Group } from './usage.repository';
import { maybeCtx, requireAdmin, requireOwner } from '@/server/context';
import type { BudgetInputType } from './usage.types';

const logger = createLogger('usage');
const FX_KEY = 'fx_usd_vnd';
const DEFAULT_FX = 25_000;

async function prices(): Promise<PriceRow[]> {
  const rows = await usageRepository.prices();
  if (rows.length) return rows;
  await usageRepository.replacePrices(DEFAULT_PRICES);
  return await usageRepository.prices();
}

export interface RecordInput {
  kind: UsageKind;
  provider: string;
  model: string;
  usage: Usage;
  estimated?: boolean;
  durationMs: number;
  purpose?: string;
  sceneId?: string;
}

export interface BudgetStatus extends Budget {
  channelName: string | null;
  spentUsd: number;
  pct: number;
  state: 'ok' | 'alert' | 'over';
}

async function statusOf(b: Budget, at = new Date()): Promise<BudgetStatus> {
  const spentUsd = await usageRepository.spent(periodStart(b.period, at), b.scope === 'channel' ? b.channelId : null);
  const pct = Math.round((spentUsd / b.limitUsd) * 100);
  return { ...b, channelName: b.channelId ? ((await channelRepository.find(b.channelId))?.name ?? null) : null, spentUsd, pct, state: spentUsd >= b.limitUsd ? 'over' : pct >= b.alertPct ? 'alert' : 'ok' };
}

const fx = async () => Number(await usageRepository.pref(FX_KEY)) || DEFAULT_FX;

export const usageService = {
  /** Writes one paid call to the ledger with its cost. Never throws: a ledger problem must not break the call itself. */
  async record(input: RecordInput): Promise<void> {
    try {
      const scope = (maybeCtx()?.usage ?? {});
      const price = pickPrice(await prices(), input.kind, input.provider, input.model);
      await usageRepository.insert({
        at: now(), kind: input.kind, provider: input.provider, model: input.model, purpose: input.purpose ?? scope.purpose ?? '',
        channelId: scope.channelId ?? null, seriesId: scope.seriesId ?? null, episodeId: scope.episodeId ?? null, sceneId: input.sceneId ?? scope.sceneId ?? null, jobId: scope.jobId ?? null, threadId: scope.threadId ?? null, via: scope.via ?? '',
        inputTokens: input.usage.inputTokens, outputTokens: input.usage.outputTokens, cachedTokens: input.usage.cachedTokens, units: input.usage.units,
        costUsd: price ? costOf(input.usage, price) : null, estimated: input.estimated ?? false, durationMs: input.durationMs,
      });
    } catch (e) {
      logger.error('could not record usage', { error: e });
    }
  },

  /** Called before a paid call: a budget set to "block" that is used up stops new spending until the period ends. */
  async assertWithinBudget(): Promise<void> {
    const { channelId } = (maybeCtx()?.usage ?? {});
    for (const b of await usageRepository.budgets()) {
      if (b.mode !== 'block') continue;
      if (b.scope === 'channel' && b.channelId !== channelId) continue;
      const s = await statusOf(b);
      if (s.state !== 'over') continue;
      const who = b.scope === 'global' ? 'toàn bộ' : `kênh ${s.channelName ?? ''}`.trim();
      throw new UserFacingError(`Đã dùng hết ngân sách ${b.period === 'day' ? 'hôm nay' : 'tháng này'} của ${who} ($${s.spentUsd.toFixed(2)} / $${b.limitUsd.toFixed(2)}). Mở trang Chi phí để tăng hạn mức hoặc chờ sang kỳ mới.`);
    }
  },

  /** Spending of the workspace, or of one project when `channelId` is given. */
  async summary(range: UsageRange, channelId?: string) {
    if (channelId && !(await channelRepository.find(channelId))) throw notFound('kênh');
    const from = rangeStart(range);
    const names = async (key: string | null, kind: 'channel' | 'episode') => (!key ? null : kind === 'channel' ? ((await channelRepository.find(key))?.name ?? null) : await episodeName(key));
    const daily = new Map<string, { day: string; llm: number; image: number; tts: number }>();
    for (const r of await usageRepository.daily(from, channelId)) {
      const d = daily.get(r.day) ?? { day: r.day, llm: 0, image: 0, tts: 0 };
      d[r.kind] += r.usd;
      daily.set(r.day, d);
    }
    const label = async (g: Group, kind: 'channel' | 'episode') => ({ ...g, id: g.key, name: await names(g.key, kind) });
    return {
      range,
      from,
      fxUsdVnd: await fx(),
      totals: await usageRepository.totals(from, channelId),
      daily: [...daily.values()],
      byChannel: channelId ? [] : await Promise.all((await usageRepository.by('channel_id', from)).map((g) => label(g, 'channel'))),
      byPurpose: await usageRepository.by('purpose', from, 20, channelId),
      byModel: await usageRepository.byModel(from, channelId),
      topEpisodes: await Promise.all((await usageRepository.by('episode_id', from, 10, channelId)).filter((g) => g.key).map((g) => label(g, 'episode'))),
      budgets: await Promise.all((await usageRepository.budgets()).filter((b) => !channelId || b.scope === 'global' || b.channelId === channelId).map((b) => statusOf(b))),
    };
  },

  /** What each video of a channel has cost so far (USD), by episode id: for list screens. */
  async episodeCosts(channelId: string): Promise<Record<string, number>> {
    if (!(await channelRepository.find(channelId))) throw notFound('kênh');
    return Object.fromEntries((await usageRepository.episodeCosts(channelId)).map((r) => [r.episodeId, r.usd]));
  },

  async events(q: { range?: UsageRange; before?: string; kind?: UsageKind; channelId?: string; episodeId?: string; limit?: number }) {
    return Promise.all((await usageRepository
      .events({ from: q.range ? rangeStart(q.range) : undefined, before: q.before, kind: q.kind, channelId: q.channelId, episodeId: q.episodeId, limit: Math.min(q.limit ?? 50, 200) }))
      .map(async (e) => ({ ...e, channelName: e.channelId ? ((await channelRepository.find(e.channelId))?.name ?? null) : null, episodeTitle: e.episodeId ? await episodeName(e.episodeId) : null })));
  },

  /** What a batch of pictures and voices is expected to cost, from the price book (null when a price is missing). */
  async estimate(input: { images: number; texts: string[]; voice: string }) {
    const book = await prices();
    let usd = 0;
    let unknown = false;
    if (input.images > 0) {
      const s = await settingsService.image();
      const p = pickPrice(book, 'image', s.provider, s.model);
      if (p) usd += costOf({ inputTokens: 0, outputTokens: 0, cachedTokens: 0, units: input.images }, p);
      else unknown = true;
    }
    const voiceSeconds = input.texts.reduce((n, t) => n + estimateSpeechSec(t), 0);
    if (input.texts.length && input.voice && isGoogleVoice(input.voice)) {
      const p = pickPrice(book, 'tts', 'gemini', GEMINI_TTS_MODEL());
      if (p) usd += costOf({ inputTokens: input.texts.reduce((n, t) => n + estimateTokens(t), 0), outputTokens: Math.round(voiceSeconds * TTS_TOKENS_PER_SECOND), cachedTokens: 0, units: 0 }, p);
      else unknown = true;
    }
    return { usd: unknown ? null : usd, images: input.images, voiceSeconds: Math.round(voiceSeconds), fxUsdVnd: await fx() };
  },

  prices,
  async savePrices(rows: Omit<PriceRow, 'id'>[]) {
    requireAdmin();
    await usageRepository.replacePrices(rows);
    return await usageRepository.prices();
  },
  async resetPrices() {
    requireAdmin();
    await usageRepository.replacePrices(DEFAULT_PRICES);
    return await usageRepository.prices();
  },

  budgets: async () => Promise.all((await usageRepository.budgets()).map((b) => statusOf(b))),
  async saveBudget(input: BudgetInputType) {
    requireOwner();
    if (input.scope === 'channel' && !(input.channelId && await channelRepository.find(input.channelId))) throw new UserFacingError('Chọn kênh cho ngân sách theo kênh.');
    await usageRepository.upsertBudget({ ...input, channelId: input.scope === 'channel' ? input.channelId : null }, now());
    return await usageService.budgets();
  },
  async removeBudget(id: string) {
    requireOwner();
    await usageRepository.removeBudget(id);
    return await usageService.budgets();
  },

  prefs: async () => ({ fxUsdVnd: await fx() }),
  async savePrefs(fxUsdVnd: number) {
    requireOwner();
    await usageRepository.setPref(FX_KEY, String(fxUsdVnd));
    return await usageService.prefs();
  },
};

async function episodeName(episodeId: string): Promise<string | null> {
  const e = await episodeRepository.find(episodeId);
  return e ? e.title || e.topic : null;
}
