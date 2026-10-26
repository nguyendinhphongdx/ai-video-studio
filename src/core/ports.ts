// What the core needs from the outside world. The server/worker provide implementations (adapters).
import type { z } from 'zod';

import type { AiRun } from './agent/runner';
import type { ContextLayer } from './context/layer';
import type { Channel } from './domain/channel';
import type { VoiceId } from './domain/catalog';
import type { Episode, EpisodeMemory, Render } from './domain/episode';
import type { Series, SeriesVersion } from './domain/series';
import type { EventBus } from './events/events';
import type { QualityCheck } from './quality/check';
import type { Skill } from './skills/skill';
import type { ToolCatalog } from './tools/catalog';
import type { ToolRenderer } from './tools/tool';

export type EpisodePatch = Partial<Pick<Episode, 'title' | 'status' | 'scenes' | 'publish' | 'seriesVersion'>>;

export interface EpisodeStore {
  get(id: string): Promise<Episode>;
  update(id: string, patch: EpisodePatch): Promise<Episode>;
  replaceRenders(episodeId: string, renders: Omit<Render, 'id' | 'episodeId' | 'createdAt'>[]): Promise<Render[]>;
  addEvent(episodeId: string, message: string): Promise<void>;
  /** Episodes of a series ordered by number (for previous/next topics). */
  listInSeries(seriesId: string): Promise<Episode[]>;
}

export interface ChannelStore {
  get(id: string): Promise<Channel>;
}

export interface SeriesStore {
  get(id: string): Promise<Series>;
  version(seriesId: string, version: number): Promise<SeriesVersion>;
}

export interface SkillStore {
  get(id: string): Promise<Skill>;
}

export interface MemoryStore {
  /** Latest memories of a series before an episode number (null = all), newest first. */
  recent(seriesId: string, beforeNumber: number | null, limit: number): Promise<EpisodeMemory[]>;
  season(seriesId: string): Promise<string | null>;
  save(memory: EpisodeMemory): Promise<void>;
}

export interface RendererCatalog {
  get(toolId: string): ToolRenderer;
}

export interface LlmPort {
  isReady(): Promise<boolean>;
  generateObject(input: { system: string; user: string; schema: z.ZodType }): Promise<{ object: unknown; model: string }>;
}

export interface TtsPort {
  /** Writes an mp3 and returns its length in seconds. */
  synthesize(text: string, voice: VoiceId, outFile: string): Promise<number>;
}

export interface MediaPort {
  episodeDir(episodeId: string): Promise<string>;
  relative(absPath: string): string;
  absolute(relPath: string): string;
  /** Absolute path of a bundled asset under public/. */
  asset(relPath: string): string;
  dataUri(absPath: string): Promise<string>;
  exists(absPath: string): Promise<boolean>;
}

export interface VideoPort {
  concat(clips: string[], outFile: string, opts: { width: number; height: number; music?: { file: string; volume: number } }): Promise<number>;
}

export interface AiRunStore {
  record(run: AiRun): Promise<void>;
}

export interface StepRunStore {
  get(episodeId: string, step: string): Promise<{ inputsHash: string; outputs: unknown } | null>;
  save(episodeId: string, step: string, inputsHash: string, outputs: unknown): Promise<void>;
}

export interface CoreDeps {
  episodes: EpisodeStore;
  channels: ChannelStore;
  series: SeriesStore;
  skills: SkillStore;
  memory: MemoryStore;
  tools: ToolCatalog;
  renderers: RendererCatalog;
  layers: ContextLayer[];
  checks: QualityCheck[];
  llm: LlmPort;
  tts: TtsPort;
  media: MediaPort;
  video: VideoPort;
  aiRuns: AiRunStore;
  stepRuns: StepRunStore;
  events: EventBus;
}

export type ProgressFn = (fraction: number, phase?: string) => void;
