// The cost ledger on a throw-away database: calls are recorded with their scope, summed, budgeted and estimated.
import fs from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-usage-test-${process.pid}`;
  return { reported: true };
});
vi.mock('@/server/adapters/llm/openai', () => ({
  openaiClient: () => ({
    generateObject: async () => ({ object: { ok: true }, usage: env.reported ? { input: 1_000, output: 500, cached: 0 } : undefined }),
    chat: async () => ({ text: 'xin chào', toolCalls: [], usage: env.reported ? { input: 2_000, output: 100, cached: 1_000 } : undefined }),
    ping: async () => 'm',
  }),
}));

import { UserFacingError } from '@/core/domain';

type S = {
  llm: typeof import('@/server/adapters/llm/llm.service');
  usage: typeof import('@/server/modules/usage/usage.service');
  scope: typeof import('@/server/modules/usage/usage.scope');
  settings: typeof import('@/server/modules/settings/settings.service');
};
let s: S;

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    llm: await import('@/server/adapters/llm/llm.service'),
    usage: await import('@/server/modules/usage/usage.service'),
    scope: await import('@/server/modules/usage/usage.scope'),
    settings: await import('@/server/modules/settings/settings.service'),
  };
  await s.settings.settingsService.saveLlm({ provider: 'gemini', model: 'gemini-3.8-flash', apiKey: 'k' });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('usage ledger', () => {
  it('records an LLM call with the provider usage, its purpose and who it belongs to', async () => {
    await s.scope.withUsageScope({ channelId: 'ch1', episodeId: 'ep1', jobId: 'j1' }, () => s.llm.llm.generateObject({ system: 's', user: 'u', schema: {} as never, purpose: 'write-episode' }));
    const e = s.usage.usageService.events({ limit: 5 })[0]!;
    expect(e).toMatchObject({ kind: 'llm', provider: 'gemini', model: 'gemini-3.8-flash', purpose: 'write-episode', channelId: 'ch1', episodeId: 'ep1', jobId: 'j1', inputTokens: 1000, outputTokens: 500, estimated: false });
    // gemini flash: 1000 in x 0.30 + 500 out x 2.50 per million
    expect(e.costUsd).toBeCloseTo((1000 * 0.3 + 500 * 2.5) / 1e6, 8);
  });

  it('splits cached tokens, and estimates (and says so) when the provider reports no usage', async () => {
    await s.scope.withUsageScope({ channelId: 'ch1', threadId: 't1' }, () => s.llm.llm.chat({ system: 'abc', messages: [], tools: [], purpose: 'assistant' }));
    expect(s.usage.usageService.events({ limit: 1 })[0]).toMatchObject({ purpose: 'assistant', threadId: 't1', inputTokens: 2000, cachedTokens: 1000, outputTokens: 100 });
    env.reported = false;
    await s.llm.llm.generateObject({ system: 'x'.repeat(400), user: '', schema: {} as never, purpose: 'suggest-topics' });
    env.reported = true;
    expect(s.usage.usageService.events({ limit: 1 })[0]).toMatchObject({ purpose: 'suggest-topics', estimated: true, inputTokens: 100 });
  });

  it('sums by kind, channel and purpose and counts what has no price', () => {
    s.usage.usageService.record({ kind: 'llm', provider: 'anthropic', model: 'some-unknown-model', usage: { inputTokens: 10, outputTokens: 10, cachedTokens: 0, units: 0 }, durationMs: 1 });
    const sum = s.usage.usageService.summary('today');
    expect(sum.totals.calls).toBe(4);
    expect(sum.totals.unpriced).toBe(1);
    expect(sum.totals.usd).toBeGreaterThan(0);
    expect(sum.byChannel.find((c) => c.id === 'ch1')!.calls).toBe(2);
    expect(sum.byPurpose.map((p) => p.key)).toContain('assistant');
    expect(sum.daily).toHaveLength(1);
  });

  it('blocks paid calls once a blocking budget is used up, and only warns for a warning budget', async () => {
    const { usageService } = s.usage;
    usageService.saveBudget({ scope: 'global', channelId: null, period: 'day', limitUsd: 0.0000001, mode: 'warn', alertPct: 80 });
    expect(() => usageService.assertWithinBudget()).not.toThrow();
    expect(usageService.budgets()[0]).toMatchObject({ state: 'over' });
    const blocking = usageService.saveBudget({ scope: 'global', channelId: null, period: 'day', limitUsd: 0.0000001, mode: 'block', alertPct: 80 }).at(-1)!;
    expect(() => usageService.assertWithinBudget()).toThrow(UserFacingError);
    await expect(s.llm.llm.chat({ system: 'a', messages: [], tools: [] })).rejects.toThrow(/ngân sách/);
    usageService.removeBudget(blocking.id);
    expect(() => usageService.assertWithinBudget()).not.toThrow();
  });

  it('keeps a channel budget to that channel', async () => {
    const { usageService } = s.usage;
    expect(() => usageService.saveBudget({ scope: 'channel', channelId: 'nope', period: 'day', limitUsd: 1, mode: 'block', alertPct: 80 })).toThrow(/kênh/);
    const repo = await import('@/server/modules/usage/usage.repository');
    const id = repo.usageRepository.upsertBudget({ scope: 'channel', channelId: 'ch1', period: 'day', limitUsd: 0.0000001, mode: 'block', alertPct: 80 }, new Date().toISOString());
    expect(() => s.scope.withUsageScope({ channelId: 'other' }, () => usageService.assertWithinBudget())).not.toThrow();
    expect(() => s.scope.withUsageScope({ channelId: 'ch1' }, () => usageService.assertWithinBudget())).toThrow(/ngân sách/);
    usageService.removeBudget(id);
  });

  it('estimates pictures and Google voices from the price book without calling anything', async () => {
    const { usageService } = s.usage;
    const pics = await usageService.estimate({ images: 4, texts: [], voice: '' });
    expect(pics.usd).toBeCloseTo(4 * 0.039, 6);
    const edge = await usageService.estimate({ images: 0, texts: ['Xin chào các bạn'], voice: 'vi-VN-HoaiMyNeural' });
    expect(edge.usd).toBe(0);
    const google = await usageService.estimate({ images: 0, texts: ['Xin chào các bạn, hôm nay mình kể một chuyện rất dài.'], voice: 'gemini-Kore' });
    expect(google.usd).toBeGreaterThan(0);
    expect(google.voiceSeconds).toBeGreaterThan(0);
  });
});
