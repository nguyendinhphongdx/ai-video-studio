// What the core needs from the outside world. The server/worker provide implementations (adapters).
import type { z } from 'zod';

import type { AiRun } from './agent/runner';
import type { ContextLayer } from './context/layer';
import type { Channel } from './domain/channel';
import type { VoiceId } from './domain/catalog';
import type { Episode, EpisodeMemory, Render, SceneAssets } from './domain/episode';
import type { Series, SeriesVersion } from './domain/series';
import type { EventBus } from './events/events';
import type { QualityCheck } from './quality/check';
import type { Skill } from './skills/skill';
import type { ToolCatalog } from './tools/catalog';
import type { ToolRenderer } from './tools/tool';

export type EpisodePatch = Partial<Pick<Episode, 'title' | 'status' | 'scenes' | 'publish' | 'seriesVersion' | 'knowledgeVersion'>>;

export interface EpisodeStore {
  get(id: string): Promise<Episode>;
  update(id: string, patch: EpisodePatch): Promise<Episode>;
  replaceRenders(episodeId: string, renders: Omit<Render, 'id' | 'episodeId' | 'createdAt'>[]): Promise<Render[]>;
  addEvent(episodeId: string, message: string): Promise<void>;
  /** Record a generated picture/voice or the approval of one scene. */
  updateScene(episodeId: string, sceneId: string, patch: Partial<SceneAssets> & { approved?: boolean }): Promise<void>;
  /** Episodes of a series ordered by number (for previous/next topics). */
  listInSeries(seriesId: string): Promise<Episode[]>;
}

export interface ChannelStore {
  get(id: string): Promise<Channel>;
  /** Latest knowledge of the channel, or null when none was written. */
  knowledge(channelId: string): Promise<{ version: number; markdown: string } | null>;
}

export interface SeriesStore {
  get(id: string): Promise<Series>;
  version(seriesId: string, version: number): Promise<SeriesVersion>;
}

/** Skills belong to a channel: ids are only unique within one. */
export interface SkillStore {
  get(channelId: string, id: string): Promise<Skill>;
  list(channelId: string): Promise<Pick<Skill, 'id' | 'name' | 'description'>[]>;
}

export interface MemoryStore {
  /** Latest memories of a series before an episode number (null = all), newest first. */
  recent(seriesId: string, beforeNumber: number | null, limit: number): Promise<EpisodeMemory[]>;
  season(seriesId: string): Promise<string | null>;
  setSeason(seriesId: string, summary: string): Promise<void>;
  /** Every episode memory of a series, oldest first. */
  all(seriesId: string): Promise<EpisodeMemory[]>;
  save(memory: EpisodeMemory): Promise<void>;
}

export interface RendererCatalog {
  get(toolId: string): ToolRenderer;
}

export interface ChatToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Provider data that must travel back with the call untouched (Gemini's thought signature). */
  meta?: Record<string, unknown>;
}

/** One message of an assistant conversation. A tool message answers one tool call of the assistant message before it. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ChatToolCall[];
  toolCallId?: string;
  isError?: boolean;
}

export interface ChatToolSpec {
  name: string;
  description: string;
  /** Zod object schema of the arguments. */
  schema: z.ZodType;
}

export interface LlmPort {
  isReady(): Promise<boolean>;
  /** One step of a tool-using conversation: the model answers with text and/or tool calls. */
  chat(input: { system: string; messages: ChatMessage[]; tools: ChatToolSpec[] }): Promise<{ text: string; toolCalls: ChatToolCall[]; model: string }>;
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
  /** Writes one frame of a video as an image. */
  frame(videoFile: string, atSec: number, outFile: string): Promise<void>;
  concat(clips: string[], outFile: string, opts: { width: number; height: number; music?: { file: string; volume: number } }): Promise<number>;
}

export interface ImagePort {
  isReady(): Promise<boolean>;
  /** Writes one 16:9 picture for the prompt to `outFile` (png/jpg). */
  generate(prompt: string, outFile: string): Promise<void>;
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
  images: ImagePort;
  tts: TtsPort;
  media: MediaPort;
  video: VideoPort;
  aiRuns: AiRunStore;
  stepRuns: StepRunStore;
  events: EventBus;
}

export type ProgressFn = (fraction: number, phase?: string) => void;

export type AssistantMessageStatus = 'done' | 'awaiting' | 'rejected' | 'error';

export interface AssistantMessage {
  id: number;
  threadId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /** assistant messages: the tool calls it made. */
  toolCalls: ChatToolCall[];
  /** tool messages: which call this answers and the tool's name. */
  toolCallId: string | null;
  toolName: string | null;
  status: AssistantMessageStatus;
  /** One line describing the action (tool messages), for the log and approval cards. */
  summary: string;
  data: unknown;
  /** user messages: where the person was. */
  focus: unknown;
  createdAt: string;
}

export interface AssistantThreadInfo {
  id: string;
  channelId: string;
  title: string;
  mode: 'ask' | 'auto' | 'bypass';
}

/** Persistence of assistant conversations. Every step is stored as it happens, so a turn can pause for approval and resume. */
export interface AssistantStore {
  thread(threadId: string): Promise<AssistantThreadInfo>;
  messages(threadId: string): Promise<AssistantMessage[]>;
  append(threadId: string, m: Omit<AssistantMessage, 'id' | 'threadId' | 'createdAt'>): Promise<AssistantMessage>;
  update(id: number, patch: Partial<Pick<AssistantMessage, 'content' | 'status' | 'summary' | 'data'>>): Promise<void>;
}
