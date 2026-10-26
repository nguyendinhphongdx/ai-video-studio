import { describe, expect, it } from 'vitest';

import { CONTEXT_LAYERS } from '@/core/context/providers';
import type { EpisodeMemory } from '@/core/domain';
import type { CoreDeps } from '@/core/ports';
import { activeSlots, lintFormat } from '@/core/series/format';
import { defaultFormat } from '@/core/series/plan';
import { ROLLUP_EVERY, summarizeEpisode } from '@/core/workflows/memory';
import { toolCatalog } from '@/tools/registry';

import { channel, episode, skill, version } from '../fixtures';

const fullSkill = { ...skill, tools: ['remotion'], scenes: { min: 4, max: 8 } };

describe('default series format', () => {
  it('builds locked intro/outro, a recap from episode 2, lesson and quiz from a full skill', () => {
    const f = defaultFormat(fullSkill, toolCatalog, 'Gà Bông đây.');
    expect(f.slots.map((s) => [s.id, s.fill, s.when])).toEqual([
      ['intro', 'locked', 'always'],
      ['recap', 'ai', 'not-first'],
      ['lesson', 'ai', 'always'],
      ['quiz', 'ai', 'always'],
      ['outro', 'locked', 'always'],
    ]);
    expect(f.slots[0]!.locked?.narration).toBe('Gà Bông đây! Tập {n}: {topic}!');
    expect(f.slots[1]!.blocks).toEqual(['remotion/recap']);
    expect(f.slots[2]!.blocks).not.toContain('remotion/quiz');
    expect(lintFormat(f)).toEqual([]);
    expect(activeSlots(f, 1).map((s) => s.id)).not.toContain('recap');
  });

  it('falls back to cards for recap and omits the quiz when the skill lacks those blocks', () => {
    const f = defaultFormat(skill, toolCatalog);
    expect(f.slots.map((s) => s.id)).toEqual(['intro', 'recap', 'lesson', 'outro']);
    expect(f.slots[1]!.blocks).toEqual(['remotion/cards']);
    expect(lintFormat(f)).toEqual([]);
  });

  it('always has an AI slot, even for a skill with only title and outro', () => {
    const f = defaultFormat({ ...skill, tools: ['remotion/title', 'remotion/outro'] }, toolCatalog);
    expect(f.slots.some((s) => s.fill === 'ai')).toBe(true);
    expect(lintFormat(f)).toEqual([]);
  });
});

describe('season rollup', () => {
  const memory = (n: number): EpisodeMemory => ({ episodeId: `e${n}`, seriesId: 's1', number: n, title: `Tập ${n}`, summary: `Dạy số ${n}`, concepts: [`số ${n}`], examples: [], vocabulary: [], jokes: [], createdAt: '' });

  function fakeDeps(count: number) {
    const saved: { season?: string } = {};
    const events: string[] = [];
    const llmCalls: string[] = [];
    const deps = {
      episodes: {
        get: async () => episode({ status: 'video_review', title: 'Số 3', scenes: [] }),
        addEvent: async (_id: string, m: string) => void events.push(m),
        listInSeries: async () => [],
      },
      channels: { get: async () => channel, knowledge: async () => null },
      series: { get: async () => ({ id: 's1', channelId: 'c1', name: 'Bé học đếm', status: 'active', currentVersion: 2, createdAt: '', updatedAt: '' }), version: async () => version },
      skills: { get: async () => skill },
      memory: {
        season: async () => null,
        recent: async () => [],
        save: async () => {},
        all: async () => Array.from({ length: count }, (_, i) => memory(i + 1)),
        setSeason: async (_s: string, summary: string) => void (saved.season = summary),
      },
      tools: toolCatalog,
      layers: CONTEXT_LAYERS,
      llm: {
        isReady: async () => true,
        generateObject: async (i: { user: string }) => {
          llmCalls.push(i.user.includes('Bộ nhớ từng tập') ? 'rollup' : 'summarize');
          return { object: i.user.includes('Bộ nhớ từng tập') ? { summary: 'Cả mùa dạy số 1-10' } : { summary: 's', concepts: [], examples: [], vocabulary: [], jokes: [] }, model: 'fake' };
        },
      },
      aiRuns: { record: async () => {} },
    } as unknown as CoreDeps;
    return { deps, saved, events, llmCalls };
  }

  it(`folds the memory into a season summary every ${ROLLUP_EVERY} approved episodes`, async () => {
    const t = fakeDeps(ROLLUP_EVERY);
    await summarizeEpisode(t.deps, 'e1');
    expect(t.llmCalls).toEqual(['summarize', 'rollup']);
    expect(t.saved.season).toBe('Cả mùa dạy số 1-10');
    expect(t.events.at(-1)).toContain('tóm tắt mùa');
  });

  it('does not roll up in between', async () => {
    const t = fakeDeps(ROLLUP_EVERY - 1);
    await summarizeEpisode(t.deps, 'e1');
    expect(t.llmCalls).toEqual(['summarize']);
    expect(t.saved.season).toBeUndefined();
  });
});
