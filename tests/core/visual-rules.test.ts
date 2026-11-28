import { describe, expect, it } from 'vitest';

import { reviseEpisodeTask } from '@/core/tasks/revise-episode';
import { planStoryTask } from '@/core/tasks/plan-story';
import { TALE_BRIEF, VISUAL_BRIEF } from '@/core/tasks/story';
import { writeEpisodeTask } from '@/core/tasks/write-episode';
import type { ToolCatalog } from '@/core/tools/catalog';

describe('visual rules', () => {
  it('are part of every script that is written or revised, whatever the skill', () => {
    const catalog = {} as ToolCatalog;
    const ctx = {} as never;
    expect(writeEpisodeTask(catalog).prompt({}, ctx)).toContain(VISUAL_BRIEF);
    expect(reviseEpisodeTask(catalog).prompt({ current: { title: '', slots: {}, publish: {} as never }, feedback: 'x' }, ctx)).toContain(VISUAL_BRIEF);
  });

  it('plans and writes every tale with its introduction, whatever the skill', () => {
    expect(planStoryTask.prompt({ scenes: 12, slots: '' }, {} as never)).toContain(TALE_BRIEF);
    expect(writeEpisodeTask({} as ToolCatalog).prompt({}, {} as never)).toContain(TALE_BRIEF);
  });
});
