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
  scope: typeof import('@/server/context');
  settings: typeof import('@/server/modules/settings/settings.service');
};
let s: S;

beforeAll(async () => {
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  s = {
    llm: await import('@/server/adapters/llm/llm.service'),
    usage: await import('@/server/modules/usage/usage.service'),
    scope: await import('@/server/context'),
    settings: await import('@/server/modules/settings/settings.service'),
  };
  await s.settings.settingsService.saveLlm({ provider: 'gemini', model: 'gemini-3.8-flash', apiKey: 'k' });
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

describe('usage ledger', () => {
  it('records an LLM call with the provider usage, its purpose and who it belongs to', async () => {
    await s.scope.withUsage({ channelId: 'ch1', episodeId: 'ep1', jobId: 'j1' }, () => s.llm.llm.generateObject({ system: 's', user: 'u', schema: {} as never, purpose: 'write-episode' }));
    const e = (await s.usage.usageService.events({ limit: 5 }))[0]!;
    expect(e).toMatchObject({ kind: 'llm', provider: 'gemini', model: 'gemini-3.8-flash', purpose: 'write-episode', channelId: 'ch1', episodeId: 'ep1', jobId: 'j1', inputTokens: 1000, outputTokens: 500, estimated: false });
    // gemini flash: 1000 in x 0.30 + 500 out x 2.50 per million
    expect(e.costUsd).toBeCloseTo((1000 * 0.3 + 500 * 2.5) / 1e6, 8);
  });

  it('totals what each video of a channel has cost, and treats a channel that is not there as not found', async () => {
    const { usageRepository } = await import('@/server/modules/usage/usage.repository');
    const costs = await usageRepository.episodeCosts('ch1');
    expect(costs).toHaveLength(1);
    expect(costs[0]).toMatchObject({ episodeId: 'ep1', calls: 1 });
    expect(costs[0]!.usd).toBeCloseTo((1000 * 0.3 + 500 * 2.5) / 1e6, 8);
    expect(await usageRepository.episodeCosts('other-channel')).toEqual([]);
    await expect(s.usage.usageService.episodeCosts('nope')).rejects.toThrow(/kênh/);
  });

  it('splits cached tokens, and estimates (and says so) when the provider reports no usage', async () => {
    await s.scope.withUsage({ channelId: 'ch1', threadId: 't1' }, () => s.llm.llm.chat({ system: 'abc', messages: [], tools: [], purpose: 'assistant' }));
    expect((await s.usage.usageService.events({ limit: 1 }))[0]).toMatchObject({ purpose: 'assistant', threadId: 't1', inputTokens: 2000, cachedTokens: 1000, outputTokens: 100 });
    env.reported = false;
    await s.llm.llm.generateObject({ system: 'x'.repeat(400), user: '', schema: {} as never, purpose: 'suggest-topics' });
    env.reported = true;
    expect((await s.usage.usageService.events({ limit: 1 }))[0]).toMatchObject({ purpose: 'suggest-topics', estimated: true, inputTokens: 100 });
  });

  it('sums by kind, channel and purpose and counts what has no price', async () => {
    await s.usage.usageService.record({ kind: 'llm', provider: 'anthropic', model: 'some-unknown-model', usage: { inputTokens: 10, outputTokens: 10, cachedTokens: 0, units: 0 }, durationMs: 1 });
    const sum = await s.usage.usageService.summary('today');
    expect(sum.totals.calls).toBe(4);
    expect(sum.totals.unpriced).toBe(1);
    expect(sum.totals.usd).toBeGreaterThan(0);
    expect(sum.byChannel.find((c) => c.id === 'ch1')!.calls).toBe(2);
    expect(sum.byPurpose.map((p) => p.key)).toContain('assistant');
    expect(sum.daily).toHaveLength(1);
  });

  it('sums one project on its own and refuses a project that is not in the workspace', async () => {
    const { usageRepository: repo } = await import('@/server/modules/usage/usage.repository');
    const from = '2000-01-01T00:00:00.000Z';
    const all = await repo.totals(from);
    const one = await repo.totals(from, 'ch1');
    expect(one.calls).toBe(2);
    expect(one.calls).toBeLessThan(all.calls);
    expect((await repo.daily(from, 'ch1')).reduce((n, d) => n + d.usd, 0)).toBeCloseTo(one.usd, 8);
    expect((await repo.by('purpose', from, 10, 'ch1')).map((g) => g.key)).not.toContain('suggest-topics');
    expect(await repo.totals(from, 'other-channel')).toMatchObject({ calls: 0, usd: 0 });
    await expect(s.usage.usageService.summary('today', 'nope')).rejects.toThrow(/kênh/);
  });

  it('blocks paid calls once a blocking budget is used up, and only warns for a warning budget', async () => {
    const { usageService } = s.usage;
    await usageService.saveBudget({ scope: 'global', channelId: null, period: 'day', limitUsd: 0.0000001, mode: 'warn', alertPct: 80 });
    await (async () => usageService.assertWithinBudget())();
    expect((await usageService.budgets())[0]).toMatchObject({ state: 'over' });
    const blocking = (await usageService.saveBudget({ scope: 'global', channelId: null, period: 'day', limitUsd: 0.0000001, mode: 'block', alertPct: 80 })).at(-1)!;
    await expect(usageService.assertWithinBudget()).rejects.toThrow(UserFacingError);
    await expect(s.llm.llm.chat({ system: 'a', messages: [], tools: [] })).rejects.toThrow(/ngân sách/);
    await usageService.removeBudget(blocking.id);
    await (async () => usageService.assertWithinBudget())();
  });

  it('keeps a channel budget to that channel', async () => {
    const { usageService } = s.usage;
    await expect(usageService.saveBudget({ scope: 'channel', channelId: 'nope', period: 'day', limitUsd: 1, mode: 'block', alertPct: 80 })).rejects.toThrow(/kênh/);
    const repo = await import('@/server/modules/usage/usage.repository');
    const id = await repo.usageRepository.upsertBudget({ scope: 'channel', channelId: 'ch1', period: 'day', limitUsd: 0.0000001, mode: 'block', alertPct: 80 }, new Date().toISOString());
    await s.scope.withUsage({ channelId: 'other' }, () => usageService.assertWithinBudget());
    await expect(async () => s.scope.withUsage({ channelId: 'ch1' }, () => usageService.assertWithinBudget())).rejects.toThrow(/ngân sách/);
    await usageService.removeBudget(id);
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
