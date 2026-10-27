import { z } from 'zod';

import type { UsageRange } from '@/core/usage/period';

export const PriceInput = z.object({
  kind: z.enum(['llm', 'image', 'tts']),
  provider: z.string().trim().max(40).nullable(),
  pattern: z.string().trim().max(80),
  inputPerMtok: z.number().min(0).max(100_000),
  outputPerMtok: z.number().min(0).max(100_000),
  cachedPerMtok: z.number().min(0).max(100_000),
  perUnit: z.number().min(0).max(1000),
  note: z.string().trim().max(200).default(''),
});
export const PricesInput = z.object({ prices: z.array(PriceInput).max(200) });

export const BudgetInput = z.object({
  id: z.string().max(40).optional(),
  scope: z.enum(['global', 'channel']),
  channelId: z.string().max(40).nullable().default(null),
  period: z.enum(['day', 'month']),
  limitUsd: z.number().positive('Hạn mức phải lớn hơn 0').max(1_000_000),
  mode: z.enum(['warn', 'block']).default('warn'),
  alertPct: z.number().int().min(1).max(100).default(80),
});
export type BudgetInputType = z.infer<typeof BudgetInput>;

export const PrefsInput = z.object({ fxUsdVnd: z.number().min(1).max(1_000_000) });
export const EstimateInput = z.object({ images: z.number().int().min(0).max(500).default(0), texts: z.array(z.string().max(2000)).max(500).default([]), voice: z.string().max(60).default('') });

export type { UsageRange } from '@/core/usage/period';
export const RANGES: UsageRange[] = ['today', '7d', '30d', 'month', 'all'];
