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

/** One planned episode of the roadmap. */
export const RoadmapItem = z.object({ topic: z.string().trim().min(3, 'Chủ đề tập quá ngắn').max(300), goal: z.string().trim().max(300).default('') });
export type RoadmapItem = z.infer<typeof RoadmapItem>;

const SeriesBase = SeriesRulesInput.extend({ name: z.string().trim().min(1).max(80), roadmap: z.array(RoadmapItem).max(60).default([]) });

/** New series: its rules (v1) and the planned episodes, created together. */
export const CreateSeriesInput = SeriesBase.extend({ channelId: z.string().min(1) });
export type CreateSeriesInput = z.infer<typeof CreateSeriesInput>;

/** Export/import file format (one JSON file per series). */
export const SeriesFile = SeriesBase.extend({ kind: z.literal('ai-video-studio/series'), schema: z.literal(1) });
export type SeriesFile = z.infer<typeof SeriesFile>;

export const SeriesPatch = z.object({ name: z.string().trim().min(1).max(80).optional(), status: z.enum(['active', 'archived']).optional() });
export type SeriesPatch = z.infer<typeof SeriesPatch>;

export const ReorderInput = z.object({ episodeIds: z.array(z.string()).min(1).max(60) });
export const WriteBatchInput = z.object({ episodeIds: z.array(z.string()).min(1).max(60) });

export const EpisodeMemoryPatch = z.object({
  summary: z.string().trim().max(1000),
  concepts: z.array(z.string().trim().min(1).max(120)).max(30),
  examples: z.array(z.string().trim().min(1).max(120)).max(30),
  vocabulary: z.array(z.string().trim().min(1).max(120)).max(50),
  jokes: z.array(z.string().trim().min(1).max(200)).max(20),
});
export type EpisodeMemoryPatch = z.infer<typeof EpisodeMemoryPatch>;

export const SeasonPatch = z.object({ summary: z.string().trim().max(3000) });
