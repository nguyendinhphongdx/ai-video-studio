import { z } from 'zod';

import { FORMAT_IDS, VOICE_IDS, type EpisodeEvent, type Episode, type Job, type Render } from '@/core/domain';
import type { QualityIssue } from '@/core/quality/check';
import { PublishKitSchema } from '@/core/script/publish';

const formats = z.array(z.enum(FORMAT_IDS as [string, ...string[]])).min(1, 'Chọn ít nhất 1 khung hình') as z.ZodType<Episode['formats']>;
const voice = z.enum(VOICE_IDS as [string, ...string[]]) as z.ZodType<Episode['voice']>;

/** A one-off video, or a new episode at the end of a series (seriesId set). */
export const CreateEpisodeInput = z.object({
  channelId: z.string().min(1),
  seriesId: z.string().nullable().default(null),
  skillId: z.string().min(1).optional(),
  topic: z.string().trim().min(3, 'Gõ ý tưởng video trước nhé').max(300),
  goal: z.string().trim().max(300).default(''),
  notes: z.string().trim().max(1000).default(''),
  formats,
  voice: voice.optional(),
  music: z.boolean().default(true),
  sceneCount: z.number().int().min(2).max(20).nullable().default(null),
  /** Plan only (series roadmap): no script job yet. */
  planOnly: z.boolean().default(false),
});
export type CreateEpisodeInput = z.infer<typeof CreateEpisodeInput>;

export const SaveScriptInput = z.object({
  title: z.string().trim().max(80),
  scenes: z
    .array(z.object({ id: z.string().optional(), slotId: z.string(), block: z.string(), locked: z.boolean().default(false), narration: z.string().max(600), props: z.record(z.string(), z.unknown()) }))
    .max(40),
  publish: PublishKitSchema.nullable(),
});
export type SaveScriptInput = z.infer<typeof SaveScriptInput>;

export const EpisodeOptionsInput = z.object({ formats: formats.optional(), voice: voice.optional(), music: z.boolean().optional() });
export type EpisodeOptionsInput = z.infer<typeof EpisodeOptionsInput>;

export interface RenderView extends Render {
  url: string;
  thumbnailUrl: string | null;
}

/** A format slot as the storyboard needs it (which blocks can be added where). */
export interface SlotView {
  id: string;
  name: string;
  fill: 'locked' | 'ai';
  blocks: string[];
  scenes: { min: number; max: number };
}

/** Everything a screen needs about one episode. */
export interface EpisodeView {
  episode: Episode;
  /** Running/queued job, or the latest one when it failed (so the UI can show the error and retry). */
  job: Job | null;
  renders: RenderView[];
  events: EpisodeEvent[];
  issues: QualityIssue[];
  /** Active slots of this episode's format (empty in list views). */
  slots: SlotView[];
  /** Target duration from the series format, if any. */
  durationSec: { min: number; max: number } | null;
}
