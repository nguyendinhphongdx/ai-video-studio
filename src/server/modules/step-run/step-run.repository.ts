import type { StepRunStore } from '@/core/ports';
import { db, json, now } from '@/server/db';
import { ctx } from '@/server/context';

export const stepRunStore: StepRunStore = {
  async get(episodeId, step) {
    const r = db().prepare('SELECT inputs_hash, outputs FROM step_runs WHERE episode_id = ? AND step = ? AND workspace_id = ?').get(episodeId, step, ctx().workspaceId) as { inputs_hash: string; outputs: string } | undefined;
    return r ? { inputsHash: r.inputs_hash, outputs: json(r.outputs, null) } : null;
  },
  async save(episodeId, step, inputsHash, outputs) {
    db()
      // The episode id is unique, so the conflict key stays (episode_id, step); the workspace check keeps another
      // workspace's row from being overwritten.
      .prepare('INSERT INTO step_runs (episode_id, step, inputs_hash, outputs, updated_at, workspace_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(episode_id, step) DO UPDATE SET inputs_hash = excluded.inputs_hash, outputs = excluded.outputs, updated_at = excluded.updated_at WHERE step_runs.workspace_id = excluded.workspace_id')
      .run(episodeId, step, inputsHash, JSON.stringify(outputs), now(), ctx().workspaceId, ctx().userId);
  },
};
