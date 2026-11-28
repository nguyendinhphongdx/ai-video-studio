// What a live signal means for the screens (0006, docs/conventions/10-live-updates.md): which cached queries it makes
// stale. Pure, so it is easy to test; the one place a topic is tied to query keys.
import type { Signal } from '@/server/modules/changes/changes.types';

export type Key = readonly unknown[];

/** What a signal carries to the screen. */
export type LiveSignal = Pick<Signal, 'topic' | 'ref'> & { data: Record<string, unknown> };

const TERMINAL = new Set(['done', 'failed']);
export const isTerminal = (state: unknown) => typeof state === 'string' && TERMINAL.has(state);

/** What a job's end may have changed on screen. */
const JOB_AFFECTS: Key[] = [['channel'], ['channels'], ['config'], ['usage'], ['episodes'], ['episode'], ['series-episodes'], ['drawing'], ['logo-draft']];

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/** The queries a signal makes stale: refreshed once, in a batch. */
export function staleKeys(s: LiveSignal): Key[] {
  switch (s.topic) {
    case 'job': {
      // A job that is running changes only what the screen patches (its progress); a new one shows up where it is
      // waited for, and its end changes the data.
      if (s.data.state === 'queued') {
        const keys: Key[] = [['drawing'], ['logo-draft']];
        if (str(s.data.threadId)) keys.push(['assistant-thread', s.data.threadId]);
        return keys;
      }
      if (!isTerminal(s.data.state)) return [];
      const keys: Key[] = [['job', s.ref], ...JOB_AFFECTS];
      if (str(s.data.threadId)) keys.push(['assistant-thread', s.data.threadId]);
      return keys;
    }
    case 'episode':
      return [['episode', s.ref], ['episodes'], ['series-episodes']];
    case 'project':
      return [['channel', s.ref], ['channels']];
    case 'series':
      return [['series'], ['series-one', s.ref], ['series-episodes', s.ref], ['setup-series']];
    case 'usage':
      return [['usage'], ['episode-costs']];
    case 'skill':
      return [['skills'], ['skill'], ['market']];
    case 'knowledge':
      return [['knowledge', s.ref]];
    case 'member':
      return [['workspace', 'members']];
    case 'worker':
      return [['config']];
    default:
      return [];
  }
}

/** The one place a screen's job may be a stub of what the server sent: state, progress and step. */
interface JobLike {
  id: string;
  state?: string;
  progress?: number;
  phase?: string | null;
}

/**
 * A running job's progress written into what is cached (an episode view, a job), so a bar moves without a request.
 * Returns the same object when nothing applies, and `null` when the cache does not know this job yet (refetch it).
 */
export function patchJob<T extends { job?: JobLike | null }>(view: T, s: LiveSignal): T | null | undefined {
  if (s.topic !== 'job') return view;
  if (!view.job) return null;
  if (view.job.id !== s.ref) return null;
  const { state, progress, phase } = s.data as { state?: string; progress?: number; phase?: string | null };
  return { ...view, job: { ...view.job, ...(state ? { state } : {}), ...(typeof progress === 'number' ? { progress } : {}), ...(phase !== undefined ? { phase } : {}) } };
}

/**
 * A job cached on its own (`useJob`): progress and step from the signal. Its end is not written in: the result comes
 * with the refetch, and a screen that reads `state === 'done'` must find the result there.
 */
export function patchOwnJob<T extends JobLike>(job: T, s: LiveSignal): T {
  const { state, progress, phase } = s.data as { state?: string; progress?: number; phase?: string | null };
  if (isTerminal(state)) return job;
  return { ...job, ...(state ? { state } : {}), ...(typeof progress === 'number' ? { progress } : {}), ...(phase !== undefined ? { phase } : {}) };
}
