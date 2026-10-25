// What the pipeline needs from the outside world. The server/worker provide implementations;
// tests or another runtime can provide others.
import type { z } from 'zod';

import type { Channel, Format, Project, Render, VoiceId } from './domain';
import type { Skill } from './skill';
import type { ToolDefinition, ToolRenderer } from './tool';

export interface ProjectStore {
  get(id: string): Promise<Project>;
  update(id: string, patch: Partial<Pick<Project, 'title' | 'status' | 'scenes' | 'publish'>>): Promise<Project>;
  replaceRenders(projectId: string, renders: Omit<Render, 'id' | 'projectId' | 'createdAt'>[]): Promise<Render[]>;
  addEvent(projectId: string, message: string): Promise<void>;
}

export interface ChannelStore {
  get(id: string): Promise<Channel>;
}

export interface SkillStore {
  get(id: string): Promise<Skill>;
}

export interface ToolCatalog {
  get(id: string): ToolDefinition | undefined;
  all(): ToolDefinition[];
}

export interface RendererCatalog {
  get(toolId: string): ToolRenderer;
}

export interface LlmPort {
  isReady(): Promise<boolean>;
  /** Returns the raw object; the caller validates it. */
  generateObject(input: { system: string; user: string; schema: z.ZodType }): Promise<unknown>;
}

export interface TtsPort {
  /** Writes an mp3 and returns its length in seconds. */
  synthesize(text: string, voice: VoiceId, outFile: string): Promise<number>;
}

export interface MediaPort {
  /** Absolute folder for a project's generated files (created if missing). */
  projectDir(projectId: string): Promise<string>;
  /** Path relative to the media root, for storing in the database. */
  relative(absPath: string): string;
  absolute(relPath: string): string;
  /** Absolute path of a bundled asset under public/ (fonts, music). */
  asset(relPath: string): string;
  /** File as a data: URI so headless renderers need no web server. */
  dataUri(absPath: string): Promise<string>;
}

export interface VideoPort {
  /** Joins clips (normalising size/audio), optionally mixes a looping music bed; returns the duration. */
  concat(clips: string[], outFile: string, opts: { width: number; height: number; music?: { file: string; volume: number } }): Promise<number>;
}

export interface PipelineDeps {
  projects: ProjectStore;
  channels: ChannelStore;
  skills: SkillStore;
  tools: ToolCatalog;
  renderers: RendererCatalog;
  llm: LlmPort;
  tts: TtsPort;
  media: MediaPort;
  video: VideoPort;
}

/** Reports job progress (0..1) and the current phase id. */
export type ProgressFn = (fraction: number, phase?: string) => Promise<void> | void;

export type { Format };
