import { describe, expect, it } from 'vitest';

import { orderSteps, runPipeline, type PipelineStep } from '@/core/pipeline/step';
import type { StepRunStore } from '@/core/ports';
import { runChecks } from '@/core/quality/check';
import { QUALITY_CHECKS } from '@/core/quality/checks';
import { activeSlots } from '@/core/series/format';

import { episode, seriesFormat, version } from '../fixtures';

function memoryStore(): StepRunStore & { data: Map<string, { inputsHash: string; outputs: unknown }> } {
  const data = new Map<string, { inputsHash: string; outputs: unknown }>();
  return { data, get: async (e, s) => data.get(`${e}:${s}`) ?? null, save: async (e, s, h, o) => void data.set(`${e}:${s}`, { inputsHash: h, outputs: o }) };
}

describe('pipeline steps', () => {
  const calls: string[] = [];
  const step = (id: string, after: string[] = []): PipelineStep<{ v: number }> => ({
    id, label: id, after, weight: 1, inputs: (ctx) => ctx.v,
    run: async (_ctx, prev) => (calls.push(id), { id, prev: Object.keys(prev) }),
  });

  it('orders by dependencies and rejects cycles or unknown deps', () => {
    expect(orderSteps([step('c', ['b']), step('a'), step('b', ['a'])]).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(() => orderSteps([step('a', ['b']), step('b', ['a'])])).toThrow(/cycle/);
    expect(() => orderSteps([step('a', ['zzz'])])).toThrow(/unknown/);
  });

  it('reuses cached outputs when inputs are unchanged, re-runs when they change', async () => {
    const store = memoryStore();
    const steps = [step('voice'), step('render', ['voice'])];
    calls.length = 0;
    await runPipeline(steps, { v: 1 }, { episodeId: 'e', store, progress: () => {} });
    await runPipeline(steps, { v: 1 }, { episodeId: 'e', store, progress: () => {} });
    expect(calls).toEqual(['voice', 'render']);
    await runPipeline(steps, { v: 2 }, { episodeId: 'e', store, progress: () => {} });
    expect(calls).toEqual(['voice', 'render', 'voice', 'render']);
  });
});

describe('quality checks', () => {
  it('flags missing catchphrases, banned words and slot counts', () => {
    const scenes = [{ id: 'x', slotId: 'lesson', block: 'remotion/cards', locked: false, narration: 'Có con ma quỷ!', props: {}, approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } }];
    const issues = runChecks(QUALITY_CHECKS, { stage: 'script', episode: episode(), scenes, format: seriesFormat, slots: activeSlots(seriesFormat, 3), bible: version.bible, sceneSeconds: new Map(), totalSeconds: 10 });
    const ids = issues.map((i) => i.check);
    expect(ids).toEqual(expect.arrayContaining(['duration', 'slot-scenes', 'catchphrases', 'avoid']));
    expect(issues.find((i) => i.check === 'avoid')).toMatchObject({ level: 'error', sceneId: 'x' });
  });
});
