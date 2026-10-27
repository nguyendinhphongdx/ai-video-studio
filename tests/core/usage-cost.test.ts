import { describe, expect, it } from 'vitest';

import { costOf, pickPrice, type PriceRow } from '@/core/usage/cost';
import { periodStart, rangeStart } from '@/core/usage/period';

const row = (over: Partial<PriceRow>): PriceRow => ({ id: 1, kind: 'llm', provider: null, pattern: 'x', inputPerMtok: 0, outputPerMtok: 0, cachedPerMtok: 0, perUnit: 0, note: '', ...over });

describe('price lookup and cost', () => {
  const book = [
    row({ id: 1, provider: 'gemini', pattern: 'flash', inputPerMtok: 0.3, outputPerMtok: 2.5, cachedPerMtok: 0.075 }),
    row({ id: 2, provider: 'gemini', pattern: 'flash-lite', inputPerMtok: 0.1, outputPerMtok: 0.4 }),
    row({ id: 3, provider: 'openai-compatible', pattern: '' }),
    row({ id: 4, kind: 'image', provider: 'gemini', pattern: 'image', perUnit: 0.04 }),
  ];

  it('picks the most specific pattern of the right provider and kind', () => {
    expect(pickPrice(book, 'llm', 'gemini', 'Gemini-3.8-Flash')!.id).toBe(1);
    expect(pickPrice(book, 'llm', 'gemini', 'gemini-2.5-flash-lite')!.id).toBe(2);
    expect(pickPrice(book, 'llm', 'openai-compatible', 'llama3')!.id).toBe(3);
    expect(pickPrice(book, 'llm', 'anthropic', 'claude-sonnet')).toBeNull();
    expect(pickPrice(book, 'image', 'gemini', 'gemini-2.5-flash-image')!.id).toBe(4);
  });

  it('prices tokens per million with cached tokens apart, and pictures per unit', () => {
    const usd = costOf({ inputTokens: 1_000_000, cachedTokens: 2_000_000, outputTokens: 100_000, units: 0 }, book[0]!);
    expect(usd).toBeCloseTo(0.3 + 0.15 + 0.25, 6);
    expect(costOf({ inputTokens: 0, outputTokens: 0, cachedTokens: 0, units: 8 }, book[3]!)).toBeCloseTo(0.32, 6);
  });
});

describe('reporting ranges', () => {
  it('starts today, 7 days, 30 days and the month at local midnight', () => {
    const now = new Date(2026, 9, 27, 15, 30);
    expect(new Date(rangeStart('today', now)).getTime()).toBe(new Date(2026, 9, 27).getTime());
    expect(new Date(rangeStart('7d', now)).getTime()).toBe(new Date(2026, 9, 21).getTime());
    expect(new Date(rangeStart('30d', now)).getTime()).toBe(new Date(2026, 8, 28).getTime());
    expect(new Date(periodStart('month', now)).getTime()).toBe(new Date(2026, 9, 1).getTime());
  });
});
