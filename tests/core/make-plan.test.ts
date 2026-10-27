import { describe, expect, it } from 'vitest';

import { budgetWarnings, makePlan, type BudgetLike, type PlanAssets } from '@/core/scenes/make-plan';

const a = (over: Partial<PlanAssets>): PlanAssets => ({ needsImage: true, imageUrl: null, needsVoice: true, voiceUrl: null, ready: false, ...over });

describe('make-it-all plan', () => {
  it('counts only what is missing and keeps the voice texts for pricing', () => {
    const scenes = [
      { id: '1', narration: 'Một' },
      { id: '2', narration: 'Hai' },
      { id: '3', narration: '  ' },
      { id: '4', narration: 'Bốn' },
    ];
    const plan = makePlan(scenes, {
      '1': a({}),
      '2': a({ imageUrl: 'x.png', voiceUrl: 'x.mp3', ready: true }),
      '3': a({ needsVoice: true }),
      '4': a({ needsImage: false, imageUrl: null }),
    }, new Set(['2']));
    expect(plan).toMatchObject({ images: 2, voices: 2, voiceTexts: ['Một', 'Bốn'], approvable: [], empty: false });
  });

  it('lists the ready scenes that are not approved yet, and is empty when nothing is missing', () => {
    const done = a({ imageUrl: 'x', voiceUrl: 'y', ready: true });
    const plan = makePlan([{ id: '1', narration: 'a' }, { id: '2', narration: 'b' }], { '1': done, '2': done }, new Set(['2']));
    expect(plan).toMatchObject({ empty: true, approvable: ['1'] });
  });
});

describe('budget warnings', () => {
  const global: BudgetLike = { scope: 'global', channelId: null, period: 'month', limitUsd: 5, spentUsd: 4.5, mode: 'block' };
  it('says when this batch would cross a limit and whether it blocks', () => {
    expect(budgetWarnings(1, 'c1', [global])).toEqual([{ level: 'block', text: expect.stringContaining('vượt ngân sách tháng này') }]);
    expect(budgetWarnings(0.2, 'c1', [global])).toEqual([]);
  });
  it('warns that a used-up budget blocks, ignores other channels, and cannot judge an unknown price', () => {
    expect(budgetWarnings(0, 'c1', [{ ...global, spentUsd: 5 }])[0]!.text).toContain('bị chặn');
    expect(budgetWarnings(10, 'c1', [{ ...global, scope: 'channel', channelId: 'c2' }])).toEqual([]);
    expect(budgetWarnings(null, 'c1', [{ ...global, mode: 'warn' }])).toEqual([]);
  });
});
