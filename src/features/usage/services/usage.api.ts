import { api } from '@/lib/api/client';
import type { PriceRow } from '@/core/usage/cost';
import type { UsageRange } from '@/core/usage/period';
import type { usageService } from '@/server/modules/usage/usage.service';
import type { BudgetInputType } from '@/server/modules/usage/usage.types';

export type { PriceRow, UsageRange };
export type UsageSummary = Awaited<ReturnType<typeof usageService.summary>>;
export type UsageEventView = Awaited<ReturnType<typeof usageService.events>>[number];
export type BudgetStatus = UsageSummary['budgets'][number];
export type BudgetInput = BudgetInputType;
export type Estimate = Awaited<ReturnType<typeof usageService.estimate>>;

export const usageKeys = { all: ['usage'] as const, summary: (r: UsageRange) => ['usage', 'summary', r] as const, events: (r: UsageRange, kind: string) => ['usage', 'events', r, kind] as const, prices: ['usage', 'prices'] as const };

export const usageApi = {
  summary: (range: UsageRange, channelId?: string) => api<UsageSummary>(`/usage/summary?range=${range}${channelId ? `&channelId=${encodeURIComponent(channelId)}` : ''}`),
  events: (range: UsageRange, kind: string, before?: string, channelId?: string) => api<UsageEventView[]>(`/usage/events?range=${range}&limit=40${channelId ? `&channelId=${encodeURIComponent(channelId)}` : ''}${kind ? `&kind=${kind}` : ''}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
  episodeCosts: (channelId: string) => api<Record<string, number>>(`/usage/episode-costs?channelId=${encodeURIComponent(channelId)}`),
  prices: () => api<PriceRow[]>('/usage/prices'),
  savePrices: (prices: Omit<PriceRow, 'id'>[]) => api<PriceRow[]>('/usage/prices', { method: 'PUT', body: { prices } }),
  resetPrices: () => api<PriceRow[]>('/usage/prices/reset', { method: 'POST' }),
  saveBudget: (b: BudgetInput) => api<BudgetStatus[]>('/usage/budgets', { body: b }),
  removeBudget: (id: string) => api<BudgetStatus[]>(`/usage/budgets/${id}`, { method: 'DELETE' }),
  saveFx: (fxUsdVnd: number) => api<{ fxUsdVnd: number }>('/usage/prefs', { method: 'PUT', body: { fxUsdVnd } }),
  estimate: (body: { images: number; texts: string[]; voice: string }) => api<Estimate>('/usage/estimate', { body }),
};
