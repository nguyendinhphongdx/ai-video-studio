// The catalog of live signals (0006, docs/conventions/10-live-updates.md): one place that says what can be announced
// and what each announcement carries. The UI imports it too, so nothing is sent that nobody can read.
import { z } from 'zod';

/** What can change on screen. `worker` and `reset` are frames the feed makes itself; they are never stored. */
export const TOPICS = ['job', 'episode', 'project', 'series', 'usage', 'skill', 'knowledge', 'member'] as const;
export type Topic = (typeof TOPICS)[number];

const id = z.string().max(80);

/** Ids and small numbers only. The one text is a job's `phase`, which `/jobs/:id` already shows to the same workspace. */
export const SIGNAL_DATA = {
  job: z.object({ state: z.string(), progress: z.number(), phase: z.string().max(80).nullable(), kind: z.string(), episodeId: id.nullable(), channelId: id.optional(), seriesId: id.optional(), threadId: id.optional() }),
  episode: z.object({ channelId: id.optional(), seriesId: id.nullable().optional() }),
  project: z.object({}),
  series: z.object({ channelId: id.optional() }),
  usage: z.object({}),
  skill: z.object({}),
  knowledge: z.object({}),
  member: z.object({}),
} satisfies Record<Topic, z.ZodType>;

export type SignalData<T extends Topic> = z.infer<(typeof SIGNAL_DATA)[T]>;

/** What a tab receives. */
export interface Signal {
  id: number;
  topic: Topic | 'worker' | 'reset';
  ref: string;
  data: Record<string, unknown>;
}

/** The longest a progress label may be. */
export const PHASE_MAX = 80;
