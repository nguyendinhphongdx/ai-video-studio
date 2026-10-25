// A Tool is one way of drawing a scene (cards, whiteboard, HyperFrames...).
// Skills pick tools by id; the AI fills each scene's props following the tool's schema;
// the worker renders each scene with the tool's renderer. Adding a tool = one definition + one renderer.
import type { z } from 'zod';

import type { Format } from './domain';

export type ToolEngine = 'remotion' | 'hyperframes';

/** How a prop is edited in the storyboard drawer. */
export type ToolFieldKind = 'text' | 'textarea' | 'emoji' | 'count' | 'color';

export interface ToolField {
  key: string;
  label: string;
  kind: ToolFieldKind;
  hint?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

/** Isomorphic part of a tool: safe to import in the browser, the worker and the AI prompt builder. */
export interface ToolDefinition<Schema extends z.ZodType = z.ZodType> {
  id: string;
  name: string;
  /** One line for people (tool picker, skill editor). */
  summary: string;
  /** How and when the AI should use this tool; injected into the script prompt. */
  aiGuide: string;
  engine: ToolEngine;
  props: Schema;
  fields: ToolField[];
  /** Props for a scene added by hand. */
  defaults: z.infer<Schema>;
  /** Shortest on-screen time, even with a very short narration. */
  minSeconds: number;
  /** Whether the storyboard can play it live with @remotion/player. */
  previewable: boolean;
  /**
   * Clamp/clean props after the AI or the person edits them. Keeps numeric limits out of the
   * AI schema (not every provider supports them) while still guaranteeing drawable values.
   */
  normalize?: (props: z.infer<Schema>) => z.infer<Schema>;
}

/** Parse props with the tool's schema, then apply its normalizer. */
export function cleanProps(tool: ToolDefinition, props: unknown): Record<string, unknown> {
  const parsed = tool.props.parse(props);
  return (tool.normalize ? tool.normalize(parsed) : parsed) as Record<string, unknown>;
}

/** Brand data a renderer needs, with assets already resolved to URLs the renderer can load. */
export interface RenderBrand {
  name: string;
  logoSrc: string | null;
  outroText: string;
  subscribeText: string;
  palette: string[];
}

export interface SceneRenderInput {
  toolId: string;
  props: Record<string, unknown>;
  /** 1-based position among the scenes that use the same tool (whiteboard numbers its steps). */
  ordinal: number;
  brand: RenderBrand;
  format: Format;
  width: number;
  height: number;
  durationSec: number;
  /** Narration as a data URI or URL, already timed to start shortly after the scene. */
  narrationSrc: string | null;
}

export interface SceneRenderContext {
  outFile: string;
  /** Scratch folder for this scene (HyperFrames writes a project here). */
  workDir: string;
  onProgress?: (fraction: number) => void;
}

/** Server-only part of a tool: turns one scene into an mp4 clip. */
export interface ToolRenderer {
  toolId: string;
  render(input: SceneRenderInput, ctx: SceneRenderContext): Promise<void>;
}

export function defineTool<Schema extends z.ZodType>(def: ToolDefinition<Schema>): ToolDefinition<Schema> {
  return def;
}
