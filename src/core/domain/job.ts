export type JobKind = 'write_script' | 'revise_script' | 'produce' | 'summarize' | 'generate_art' | 'scene_assets' | 'assistant_turn';
export type JobState = 'queued' | 'running' | 'done' | 'failed';

export interface Job {
  id: string;
  /** Null for series-level jobs such as plan_series. */
  episodeId: string | null;
  kind: JobKind;
  payload: Record<string, unknown>;
  state: JobState;
  progress: number;
  /** Current step id, e.g. "voice" or "render". */
  phase: string | null;
  /** Short message safe to show to the person. */
  error: string | null;
  /** Output of jobs that produce data instead of changing an episode (plan_series). */
  result: unknown;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
