import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Breakdowns } from '@/features/usage/components/Breakdowns';
import { DailyChart } from '@/features/usage/components/DailyChart';
import { SummaryCards } from '@/features/usage/components/SummaryCards';
import { fmtUsd, fmtVnd } from '@/features/usage/lib/format';
import type { UsageSummary } from '@/features/usage/services/usage.api';

const today = new Date();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const summary: UsageSummary = {
  range: '7d',
  from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).toISOString(),
  fxUsdVnd: 25000,
  totals: { calls: 12, usd: 1.2345, inputTokens: 120_000, outputTokens: 30_000, cachedTokens: 5_000, images: 8, ttsSeconds: 150, unpriced: 0, estimated: 0 },
  daily: [{ day: ymd(today), llm: 0.5, image: 0.3, tts: 0.1 }],
  byChannel: [{ key: 'c1', id: 'c1', name: 'Bí ẩn quanh ta', kind: null, provider: null, calls: 10, usd: 1.2, inputTokens: 1, outputTokens: 1, units: 0 }],
  byPurpose: [{ key: 'write-episode', kind: null, provider: null, calls: 3, usd: 0.5, inputTokens: 90_000, outputTokens: 20_000, units: 0 }],
  byModel: [{ key: 'gemini-3.8-flash', kind: 'llm', provider: 'gemini', calls: 9, usd: 0.9, inputTokens: 1, outputTokens: 1, units: 0 }],
  topEpisodes: [{ key: 'e1', id: 'e1', name: 'Bí ẩn Rãnh Mariana', kind: null, provider: null, calls: 6, usd: 0.8, inputTokens: 1, outputTokens: 1, units: 0 }],
  budgets: [],
};

describe('cost screen', () => {
  it('formats money so small amounts keep meaning, in USD and VND', () => {
    expect(fmtUsd(0)).toBe('$0');
    expect(fmtUsd(0.00123)).toBe('$0.0012');
    expect(fmtUsd(0.5)).toBe('$0.5');
    expect(fmtUsd(12.3456)).toBe('$12.35');
    expect(fmtUsd(null)).toBe('—');
    expect(fmtVnd(0.5, 25000)).toContain('12.500');
  });

  it('shows the totals, the days, and the biggest spenders by name', () => {
    const cards = renderToStaticMarkup(<SummaryCards s={summary} />);
    expect(cards).toContain('$1.234');
    expect(cards).toContain('12 lượt gọi');
    expect(cards).toContain('2.5 phút');
    const chart = renderToStaticMarkup(<DailyChart s={summary} />);
    expect(chart).toContain('$0.9');
    const rows = renderToStaticMarkup(<Breakdowns s={summary} />);
    expect(rows).toContain('Bí ẩn quanh ta');
    expect(rows).toContain('Bí ẩn Rãnh Mariana');
    expect(rows).toContain('Viết kịch bản');
    expect(rows).toContain('gemini-3.8-flash');
  });

  it('says so when nothing was spent in the range', () => {
    const empty = renderToStaticMarkup(<DailyChart s={{ ...summary, daily: [] }} />);
    expect(empty).toContain('Chưa có lượt gọi nào');
  });
});
