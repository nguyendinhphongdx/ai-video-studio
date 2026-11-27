import { and, eq, sql } from 'drizzle-orm';

import type { StepRunStore } from '@/core/ports';
import { json, now } from '@/server/db';
import { one, orm, owner, scoped } from '@/server/orm';
import { stepRuns } from '@/server/schema';

export const stepRunStore: StepRunStore = {
  async get(episodeId, step) {
    const r = await orm().select({ inputsHash: stepRuns.inputsHash, outputs: stepRuns.outputs }).from(stepRuns).where(and(eq(stepRuns.episodeId, episodeId), eq(stepRuns.step, step), scoped(stepRuns))).then(one);
    return r ? { inputsHash: r.inputsHash, outputs: json(r.outputs, null) } : null;
  },
  async save(episodeId, step, inputsHash, outputs) {
    // The episode id is unique, so the conflict key stays (episode_id, step); the workspace check keeps another
    // workspace's row from being overwritten.
    await orm()
      .insert(stepRuns)
      .values({ episodeId, step, inputsHash, outputs: JSON.stringify(outputs), updatedAt: now(), ...owner() })
      .onConflictDoUpdate({
        target: [stepRuns.episodeId, stepRuns.step],
        set: { inputsHash: sql`excluded.inputs_hash`, outputs: sql`excluded.outputs`, updatedAt: sql`excluded.updated_at` },
        setWhere: sql`${stepRuns.workspaceId} = excluded.workspace_id`,
      });
  },
};
