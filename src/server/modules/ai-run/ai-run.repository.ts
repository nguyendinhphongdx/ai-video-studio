import { and, desc, eq } from 'drizzle-orm';

import type { AiRun } from '@/core/agent/runner';
import type { AiRunStore } from '@/core/ports';
import { json } from '@/server/db';
import { orm, owner, scoped } from '@/server/orm';
import { aiRuns } from '@/server/schema';

const toRun = (r: typeof aiRuns.$inferSelect): AiRun => ({
  id: r.id,
  task: r.task,
  taskVersion: r.taskVersion,
  episodeId: r.episodeId,
  seriesId: r.seriesId,
  model: r.model,
  context: r.context,
  sections: json(r.sections, []),
  prompt: r.prompt,
  output: json(r.output, null),
  error: r.error,
  durationMs: r.durationMs,
  createdAt: r.createdAt,
});

export const aiRunRepository = {
  async forEpisode(episodeId: string, limit = 20): Promise<AiRun[]> {
    return (await orm().select().from(aiRuns).where(and(eq(aiRuns.episodeId, episodeId), scoped(aiRuns))).orderBy(desc(aiRuns.createdAt)).limit(limit)).map(toRun);
  },
};

export const aiRunStore: AiRunStore = {
  async record(r) {
    await orm()
      .insert(aiRuns)
      .values({
        id: r.id, episodeId: r.episodeId, seriesId: r.seriesId, task: r.task, taskVersion: r.taskVersion, model: r.model, context: r.context, sections: JSON.stringify(r.sections), prompt: r.prompt,
        output: r.output === null ? null : JSON.stringify(r.output), error: r.error, durationMs: r.durationMs, createdAt: r.createdAt, ...owner(),
      });
  },
};
