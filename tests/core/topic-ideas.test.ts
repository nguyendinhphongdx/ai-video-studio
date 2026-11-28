import { describe, expect, it } from 'vitest';

import { CONTEXT_LAYERS } from '@/core/context/providers';
import { UserFacingError } from '@/core/domain';
import type { CoreDeps } from '@/core/ports';
import { suggestTopics } from '@/core/workflows/suggest';
import { toolCatalog } from '@/tools/registry';

import { channel, skill } from '../fixtures';

function deps(over: { defaultSkillId?: string | null } = {}) {
  const seen: { system: string; user: string }[] = [];
  const d = {
    tools: toolCatalog,
    layers: CONTEXT_LAYERS,
    channels: { get: async () => ({ ...channel, defaultSkillId: over.defaultSkillId === undefined ? 'kids-cards' : over.defaultSkillId }), knowledge: async () => ({ version: 2, markdown: '## Kiến thức\n- Rãnh Mariana sâu gần 11 km' }) },
    skills: { get: async () => skill },
    aiRuns: { record: async () => {} },
    llm: {
      generateObject: async (a: { system: string; user: string }) => {
        seen.push(a);
        return { model: 'fake', object: { ideas: [{ topic: ' Vì sao biển Chết không chìm? ', why: 'Nối tiếp video về độ mặn', after: 1 }, { topic: 'Hang Sơn Đoòng hình thành thế nào?', why: 'Chủ đề mới', after: null }, { topic: 'Thừa', why: 'x', after: 99 }] } };
      },
    },
  } as unknown as CoreDeps;
  return { d, seen };
}

describe('next video ideas', () => {
  it('feeds the channel, its knowledge and the existing videos to the model, and returns trimmed ideas up to the count', async () => {
    const { d, seen } = deps();
    const ideas = await suggestTopics(d, channel.id, [{ topic: 'Rãnh Mariana', title: 'Bí ẩn đáy biển', status: 'published', series: null, number: 1 }], 2);
    expect(ideas).toEqual([{ topic: 'Vì sao biển Chết không chìm?', why: 'Nối tiếp video về độ mặn', after: 1 }, { topic: 'Hang Sơn Đoòng hình thành thế nào?', why: 'Chủ đề mới' }]);
    expect(seen[0]!.user).toContain('Rãnh Mariana (tên: Bí ẩn đáy biển)');
    expect(seen[0]!.user).toContain('gợi ý 2 chủ đề');
    expect(seen[0]!.system).toContain('Rãnh Mariana sâu gần 11 km');
  });

  it('gives the model the story and the episodes in order with what each status means, and drops a follow-up number that does not exist', async () => {
    const { d, seen } = deps();
    const recent = [
      { topic: 'Long Vương nổi giận', title: '', status: 'planned', series: 'Na Tra', number: 4, goal: 'Biển động' },
      { topic: 'Na Tra ra đời', title: '', status: 'published', series: 'Na Tra', number: 1 },
    ];
    const ideas = await suggestTopics(d, channel.id, recent, 3, 'Na Tra nghịch ngợm, dũng cảm');
    expect(seen[0]!.user).toContain('Cốt truyện của phim:\nNa Tra nghịch ngợm, dũng cảm');
    const user = seen[0]!.user;
    expect(user.indexOf('Tập 1: Na Tra ra đời')).toBeLessThan(user.indexOf('Tập 4: Long Vương nổi giận'));
    expect(user).toContain('mới lên kế hoạch, chưa viết kịch bản');
    expect(user).toContain('mục tiêu: Biển động');
    // The fake answers "after: 1" for the first idea (exists) and 99 for the third (does not).
    expect(ideas.map((i) => i.after)).toEqual([1, undefined, undefined]);
  });

  it('asks for a default skill when the channel has none', async () => {
    await expect(suggestTopics(deps({ defaultSkillId: null }).d, channel.id, [], 3)).rejects.toBeInstanceOf(UserFacingError);
  });
});
