import { z } from 'zod';

import { VOICE_IDS, type VoiceId } from '@/core/domain/catalog';
import { LibraryItemSchema, RoadmapItem } from '@/server/modules/series/series.types';

export const SetupIdea = z.object({ idea: z.string().trim().min(10, 'Kể rõ ý tưởng hơn một chút (ít nhất 10 ký tự)').max(2000) });

/** The proposal after the person's edits: what "create the project" saves. */
export const SetupInput = z.object({
  name: z.string().trim().min(1, 'Cần tên dự án').max(60),
  description: z.string().trim().max(500),
  audience: z.string().trim().min(1).max(300),
  style: z.string().trim().min(1).max(500),
  voice: z.enum(VOICE_IDS as [VoiceId, ...VoiceId[]]),
  imageStyle: z.string().trim().max(500),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(6),
  outroText: z.string().trim().max(80),
  hashtags: z.array(z.string().regex(/^#\S+$/)).max(10),
  knowledge: z.string().max(20000),
  skillId: z.string().min(1),
  series: z.object({
    name: z.string().trim().min(1, 'Cần tên series').max(80),
    premise: z.string().max(1000),
    instructions: z.string().max(4000),
    avoid: z.array(z.string().max(200)).max(30),
    cast: z.array(LibraryItemSchema).max(20),
    roadmap: z.array(RoadmapItem).max(60),
  }),
  logoPrompt: z.string().max(400),
  introArtPrompt: z.string().max(400),
});
export type SetupInput = z.infer<typeof SetupInput>;
