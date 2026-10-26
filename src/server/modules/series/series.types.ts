import { z } from 'zod';

import { EpisodeFormatSchema } from '@/core/series/format';

export const SeriesBibleSchema = z.object({
  premise: z.string().max(1000).default(''),
  instructions: z.string().max(20000).default(''),
  host: z.string().max(200).default(''),
  catchphrases: z.array(z.string().max(200)).max(10).default([]),
  avoid: z.array(z.string().max(200)).max(30).default([]),
  characterAssets: z.array(z.string()).max(20).default([]),
});

export const PublishTemplateSchema = z.object({
  title: z.string().max(120).default('{series} | Tập {n}: {topic}'),
  hashtags: z.array(z.string().regex(/^#\S+$/)).max(10).default([]),
  descriptionFooter: z.string().max(2000).default(''),
});

/** The editable rules of a series; saving creates a new version. */
export const SeriesRulesInput = z.object({
  skillId: z.string().min(1),
  bible: SeriesBibleSchema,
  format: EpisodeFormatSchema,
  publish: PublishTemplateSchema,
});
export type SeriesRulesInput = z.infer<typeof SeriesRulesInput>;

export const CreateSeriesInput = SeriesRulesInput.extend({ channelId: z.string().min(1), name: z.string().trim().min(1).max(80) });
export type CreateSeriesInput = z.infer<typeof CreateSeriesInput>;

/** Export/import file format (one JSON file per series). */
export const SeriesFile = CreateSeriesInput.omit({ channelId: true }).extend({ kind: z.literal('ai-video-studio/series'), schema: z.literal(1) });
export type SeriesFile = z.infer<typeof SeriesFile>;
