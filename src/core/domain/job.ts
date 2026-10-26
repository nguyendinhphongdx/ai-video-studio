export type JobKind = 'write_script' | 'revise_script' | 'produce' | 'summarize';
export type JobState = 'queued' | 'running' | 'done' | 'failed';

export interface Job {
  id: string;
  episodeId: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  state: JobState;
  progress: number;
  /** Current step id, e.g. "voice" or "render". */
  phase: string | null;
  /** Short message safe to show to the person. */
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
