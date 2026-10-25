import { z } from 'zod';

import { FORMAT_IDS, VOICES, type Job, type Project, type ProjectEvent, type Render } from '@/core/domain';
import { PublishKitSchema } from '@/core/script';

const voiceIds = Object.keys(VOICES) as [keyof typeof VOICES, ...(keyof typeof VOICES)[]];
const formats = z.array(z.enum(FORMAT_IDS as [typeof FORMAT_IDS[number], ...typeof FORMAT_IDS])).min(1, 'Chọn ít nhất 1 khung hình');

export const CreateProjectInput = z.object({
  idea: z.string().trim().min(3, 'Gõ ý tưởng video trước nhé').max(500),
  channelId: z.string().min(1),
  skillId: z.string().min(1),
  formats,
  voice: z.enum(voiceIds),
  music: z.boolean(),
  sceneCount: z.number().int().min(2).max(20).nullable(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const SaveScriptInput = z.object({
  title: z.string().trim().max(80),
  scenes: z.array(z.object({ id: z.string().optional(), tool: z.string(), narration: z.string().max(600), props: z.record(z.string(), z.unknown()) })).max(30),
  publish: PublishKitSchema.nullable(),
});
export type SaveScriptInput = z.infer<typeof SaveScriptInput>;

export const ProjectOptionsInput = z.object({ formats: formats.optional(), voice: z.enum(voiceIds).optional(), music: z.boolean().optional() });
export type ProjectOptionsInput = z.infer<typeof ProjectOptionsInput>;

export interface RenderView extends Render {
  url: string;
}

/** Everything a screen needs about one project. */
export interface ProjectView {
  project: Project;
  /** Running/queued job, or the latest job when it failed (so the UI can show the error and retry). */
  job: Job | null;
  renders: RenderView[];
  events: ProjectEvent[];
}
