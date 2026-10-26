import type { AiRun } from '@/core/agent/runner';
import type { AiRunStore } from '@/core/ports';
import { db, json } from '@/server/db';

type Row = Record<string, unknown>;

const toRun = (r: Row): AiRun => ({
  id: String(r.id),
  task: String(r.task),
  taskVersion: Number(r.task_version),
  episodeId: (r.episode_id as string | null) ?? null,
  seriesId: (r.series_id as string | null) ?? null,
  model: (r.model as string | null) ?? null,
  context: String(r.context),
  sections: json(r.sections, []),
  prompt: String(r.prompt),
  output: json(r.output, null),
  error: (r.error as string | null) ?? null,
  durationMs: Number(r.duration_ms),
  createdAt: String(r.created_at),
});

export const aiRunRepository = {
  forEpisode(episodeId: string, limit = 20): AiRun[] {
    return (db().prepare('SELECT * FROM ai_runs WHERE episode_id = ? ORDER BY created_at DESC LIMIT ?').all(episodeId, limit) as Row[]).map(toRun);
  },
};

export const aiRunStore: AiRunStore = {
  async record(r) {
    db()
      .prepare(
        `INSERT INTO ai_runs (id, episode_id, series_id, task, task_version, model, context, sections, prompt, output, error, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(r.id, r.episodeId, r.seriesId, r.task, r.taskVersion, r.model, r.context, JSON.stringify(r.sections), r.prompt, r.output === null ? null : JSON.stringify(r.output), r.error, r.durationMs, r.createdAt);
  },
};
