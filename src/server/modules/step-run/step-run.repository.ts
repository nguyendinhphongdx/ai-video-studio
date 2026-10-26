import type { StepRunStore } from '@/core/ports';
import { db, json, now } from '@/server/db';

export const stepRunStore: StepRunStore = {
  async get(episodeId, step) {
    const r = db().prepare('SELECT inputs_hash, outputs FROM step_runs WHERE episode_id = ? AND step = ?').get(episodeId, step) as { inputs_hash: string; outputs: string } | undefined;
    return r ? { inputsHash: r.inputs_hash, outputs: json(r.outputs, null) } : null;
  },
  async save(episodeId, step, inputsHash, outputs) {
    db()
      .prepare('INSERT INTO step_runs (episode_id, step, inputs_hash, outputs, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(episode_id, step) DO UPDATE SET inputs_hash = excluded.inputs_hash, outputs = excluded.outputs, updated_at = excluded.updated_at')
      .run(episodeId, step, inputsHash, JSON.stringify(outputs), now());
  },
};
