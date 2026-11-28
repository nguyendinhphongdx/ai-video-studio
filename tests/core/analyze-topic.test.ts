import { describe, expect, it } from 'vitest';

import { CONTEXT_LAYERS } from '@/core/context/providers';
import { UserFacingError } from '@/core/domain';
import type { CoreDeps } from '@/core/ports';
import { analysisProblems, duplicateOf, type TopicAnalysis } from '@/core/tasks/analyze-topic';
import type { RecentVideo } from '@/core/tasks/suggest-topics';
import { analyzeTopic } from '@/core/workflows/suggest';
import { toolCatalog } from '@/tools/registry';

import { channel, skill } from '../fixtures';

const existing: RecentVideo[] = [
  { topic: 'Na Tra cứu dân Trần Đường Quan', title: '', status: 'planned', series: null, number: 5 },
  { topic: 'Long Vương nổi giận', title: 'Biển Đông dậy sóng', status: 'published', series: null, number: 4 },
];

const good: TopicAnalysis = { title: 'Na Tra gặp Thái Ất', synopsis: 'Na Tra tìm sư phụ. Cậu học được phép đầu tiên.', goal: 'Hiểu vì sao cần sư phụ', position: 'Nối tiếp tập 4, trả lời ai sẽ giúp Na Tra.', after: 4, problems: [] };

/** A model that answers each call with the next item of `answers` and records the prompts. */
function deps(answers: unknown[], over: { defaultSkillId?: string | null } = {}) {
  const seen: string[] = [];
  let i = 0;
  const d = {
    tools: toolCatalog,
    layers: CONTEXT_LAYERS,
    channels: { get: async () => ({ ...channel, defaultSkillId: over.defaultSkillId === undefined ? 'kids-cards' : over.defaultSkillId }), knowledge: async () => ({ version: 1, markdown: '' }) },
    skills: { get: async () => skill },
    aiRuns: { record: async () => {} },
    llm: {
      generateObject: async (a: { user: string }) => {
        seen.push(a.user);
        return { model: 'fake', object: answers[Math.min(i++, answers.length - 1)] };
      },
    },
  } as unknown as CoreDeps;
  return { d, seen };
}

describe('duplicate topics', () => {
  it('finds an episode that tells nearly the same story, in any case or marks, and ignores a different one', () => {
    expect(duplicateOf('na tra cuu dan tran duong quan', existing)).toMatchObject({ number: 5 });
    expect(duplicateOf('Biển Đông dậy sóng vì Long Vương', existing)).toMatchObject({ number: 4 });
    expect(duplicateOf('Na Tra học phép với Thái Ất', existing)).toBeNull();
    expect(duplicateOf('Ừ', existing)).toBeNull();
  });
});

describe('analysis problems a second try can fix', () => {
  it('flags a missing title, a long synopsis and a follow-up that is not in the list', () => {
    expect(analysisProblems(good, existing)).toEqual([]);
    const bad = { ...good, title: '', synopsis: 'Một. Hai. Ba. Bốn.', position: ' ', after: 9 };
    const found = analysisProblems(bad, existing);
    expect(found).toHaveLength(4);
    expect(found.join(' ')).toContain('tập số 9');
  });
});

describe('analyzeTopic', () => {
  it('sends the typed topic with the story and the episodes, and returns the analysis', async () => {
    const { d, seen } = deps([good]);
    const a = await analyzeTopic(d, channel.id, 'Na Tra gặp sư phụ Thái Ất', existing, 'Phong Thần kể bằng hoạt hình');
    expect(a).toMatchObject({ title: 'Na Tra gặp Thái Ất', after: 4, problems: [] });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('"Na Tra gặp sư phụ Thái Ất"');
    expect(seen[0]).toContain('Phong Thần kể bằng hoạt hình');
    expect(seen[0]).toContain('Tập 4: Long Vương nổi giận (tên: Biển Đông dậy sóng)');
  });

  it('asks once more when a machine check fails, with what was wrong, and keeps the better answer', async () => {
    const { d, seen } = deps([{ ...good, after: 9 }, good]);
    const a = await analyzeTopic(d, channel.id, 'Na Tra gặp sư phụ', existing);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain('Lần trước bạn trả lời');
    expect(seen[1]).toContain('tập số 9');
    expect(a.after).toBe(4);
  });

  it('keeps the first answer when the second is not better or fails, and never shows a follow-up that does not exist', async () => {
    const worse = { ...good, after: 9, title: '' };
    const { d } = deps([{ ...good, after: 9 }, worse]);
    expect((await analyzeTopic(d, channel.id, 'Na Tra gặp sư phụ', existing)).after).toBeNull();
  });

  it('keeps the first answer when the second try fails', async () => {
    const { d } = deps([{ ...good, after: 9 }]);
    let calls = 0;
    const first = d.llm.generateObject;
    d.llm.generateObject = (async (a: never) => {
      if (++calls > 1) throw new Error('boom');
      return first(a);
    }) as never;
    const a = await analyzeTopic(d, channel.id, 'Na Tra gặp sư phụ', existing);
    expect(calls).toBe(2);
    expect(a.title).toBe('Na Tra gặp Thái Ất');
    expect(a.after).toBeNull();
  });

  it('flags a repeated idea by comparing words, not by asking the model', async () => {
    const { d } = deps([good]);
    const a = await analyzeTopic(d, channel.id, 'Na Tra cứu dân Trần Đường Quan', existing);
    expect(a.problems[0]).toMatchObject({ kind: 'duplicate' });
    expect(a.problems[0]!.text).toContain('tập 5');
  });

  it('asks for a default skill when the channel has none', async () => {
    await expect(analyzeTopic(deps([good], { defaultSkillId: null }).d, channel.id, 'một ý tưởng', [])).rejects.toBeInstanceOf(UserFacingError);
  });
});
