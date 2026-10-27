import { UserFacingError } from '@/core/domain/errors';
import { estimateSpeechSec } from '@/core/timeline';
import { costOf, pickPrice, TTS_TOKENS_PER_SECOND, estimateTokens, type PriceRow, type Usage, type UsageKind } from '@/core/usage/cost';
import { periodStart, rangeStart, type UsageRange } from '@/core/usage/period';
import { isGoogleVoice } from '@/core/domain/catalog';
import { GEMINI_TTS_MODEL } from '@/server/config';
import { now } from '@/server/db';
import { createLogger } from '@/server/logger';
import { channelRepository } from '@/server/modules/channel/channel.repository';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { settingsService } from '@/server/modules/settings/settings.service';

import { DEFAULT_PRICES } from './pricing';
import { usageRepository, type Budget, type Group } from './usage.repository';
import { currentUsageScope } from './usage.scope';
import type { BudgetInputType } from './usage.types';

const logger = createLogger('usage');
const FX_KEY = 'fx_usd_vnd';
const DEFAULT_FX = 25_000;

function prices(): PriceRow[] {
  const rows = usageRepository.prices();
  if (rows.length) return rows;
  usageRepository.replacePrices(DEFAULT_PRICES);
  return usageRepository.prices();
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

function statusOf(b: Budget, at = new Date()): BudgetStatus {
  const spentUsd = usageRepository.spent(periodStart(b.period, at), b.scope === 'channel' ? b.channelId : null);
  const pct = Math.round((spentUsd / b.limitUsd) * 100);
  return { ...b, channelName: b.channelId ? (channelRepository.find(b.channelId)?.name ?? null) : null, spentUsd, pct, state: spentUsd >= b.limitUsd ? 'over' : pct >= b.alertPct ? 'alert' : 'ok' };
}

const fx = () => Number(usageRepository.pref(FX_KEY)) || DEFAULT_FX;

export const usageService = {
  /** Writes one paid call to the ledger with its cost. Never throws: a ledger problem must not break the call itself. */
  record(input: RecordInput): void {
    try {
      const scope = currentUsageScope();
      const price = pickPrice(prices(), input.kind, input.provider, input.model);
      usageRepository.insert({
        at: now(), kind: input.kind, provider: input.provider, model: input.model, purpose: input.purpose ?? scope.purpose ?? '',
        channelId: scope.channelId ?? null, seriesId: scope.seriesId ?? null, episodeId: scope.episodeId ?? null, sceneId: input.sceneId ?? scope.sceneId ?? null, jobId: scope.jobId ?? null, threadId: scope.threadId ?? null,
        inputTokens: input.usage.inputTokens, outputTokens: input.usage.outputTokens, cachedTokens: input.usage.cachedTokens, units: input.usage.units,
        costUsd: price ? costOf(input.usage, price) : null, estimated: input.estimated ?? false, durationMs: input.durationMs,
      });
    } catch (e) {
      logger.error('could not record usage', { error: e });
    }
  },

  /** Called before a paid call: a budget set to "block" that is used up stops new spending until the period ends. */
  assertWithinBudget(): void {
    const { channelId } = currentUsageScope();
    for (const b of usageRepository.budgets()) {
      if (b.mode !== 'block') continue;
      if (b.scope === 'channel' && b.channelId !== channelId) continue;
      const s = statusOf(b);
      if (s.state !== 'over') continue;
      const who = b.scope === 'global' ? 'toàn bộ' : `kênh ${s.channelName ?? ''}`.trim();
      throw new UserFacingError(`Đã dùng hết ngân sách ${b.period === 'day' ? 'hôm nay' : 'tháng này'} của ${who} ($${s.spentUsd.toFixed(2)} / $${b.limitUsd.toFixed(2)}). Mở trang Chi phí để tăng hạn mức hoặc chờ sang kỳ mới.`);
    }
  },

  summary(range: UsageRange) {
    const from = rangeStart(range);
    const names = (key: string | null, kind: 'channel' | 'episode') => (!key ? null : kind === 'channel' ? (channelRepository.find(key)?.name ?? null) : episodeName(key));
    const daily = new Map<string, { day: string; llm: number; image: number; tts: number }>();
    for (const r of usageRepository.daily(from)) {
      const d = daily.get(r.day) ?? { day: r.day, llm: 0, image: 0, tts: 0 };
      d[r.kind] += r.usd;
      daily.set(r.day, d);
    }
    const label = (g: Group, kind: 'channel' | 'episode') => ({ ...g, id: g.key, name: names(g.key, kind) });
    return {
      range,
      from,
      fxUsdVnd: fx(),
      totals: usageRepository.totals(from),
      daily: [...daily.values()],
      byChannel: usageRepository.by('channel_id', from).map((g) => label(g, 'channel')),
      byPurpose: usageRepository.by('purpose', from, 20),
      byModel: usageRepository.byModel(from),
      topEpisodes: usageRepository.by('episode_id', from).filter((g) => g.key).map((g) => label(g, 'episode')),
      budgets: usageRepository.budgets().map((b) => statusOf(b)),
    };
  },

  events(q: { range?: UsageRange; before?: string; kind?: UsageKind; channelId?: string; episodeId?: string; limit?: number }) {
    return usageRepository
      .events({ from: q.range ? rangeStart(q.range) : undefined, before: q.before, kind: q.kind, channelId: q.channelId, episodeId: q.episodeId, limit: Math.min(q.limit ?? 50, 200) })
      .map((e) => ({ ...e, channelName: e.channelId ? (channelRepository.find(e.channelId)?.name ?? null) : null, episodeTitle: e.episodeId ? episodeName(e.episodeId) : null }));
  },

  /** What a batch of pictures and voices is expected to cost, from the price book (null when a price is missing). */
  async estimate(input: { images: number; texts: string[]; voice: string }) {
    const book = prices();
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
    return { usd: unknown ? null : usd, images: input.images, voiceSeconds: Math.round(voiceSeconds), fxUsdVnd: fx() };
  },

  prices,
  savePrices(rows: Omit<PriceRow, 'id'>[]) {
    usageRepository.replacePrices(rows);
    return usageRepository.prices();
  },
  resetPrices() {
    usageRepository.replacePrices(DEFAULT_PRICES);
    return usageRepository.prices();
  },

  budgets: () => usageRepository.budgets().map((b) => statusOf(b)),
  saveBudget(input: BudgetInputType) {
    if (input.scope === 'channel' && !(input.channelId && channelRepository.find(input.channelId))) throw new UserFacingError('Chọn kênh cho ngân sách theo kênh.');
    usageRepository.upsertBudget({ ...input, channelId: input.scope === 'channel' ? input.channelId : null }, now());
    return usageService.budgets();
  },
  removeBudget(id: string) {
    usageRepository.removeBudget(id);
    return usageService.budgets();
  },

  prefs: () => ({ fxUsdVnd: fx() }),
  savePrefs(fxUsdVnd: number) {
    usageRepository.setPref(FX_KEY, String(fxUsdVnd));
    return usageService.prefs();
  },
};

function episodeName(episodeId: string): string | null {
  const e = episodeRepository.find(episodeId);
  return e ? e.title || e.topic : null;
}
