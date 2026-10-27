// Extension point: Tool -> Block.
// A Tool is a rendering engine a skill can name (@remotion, @hyperframes). Each tool offers Blocks:
// scene types with their own props schema (@remotion/cards). Adding a scene type = one block definition
// (+ a component/renderer); the storyboard editor is generated from `fields`.
import type { SfxCue } from '../audio/sfx';
import type { z } from 'zod';

import type { Format } from '../domain/catalog';
import type { SceneDesign } from '../domain/design';
import type { BlockRef } from '../domain/episode';

export type ToolFieldKind = 'text' | 'textarea' | 'emoji' | 'count' | 'color' | 'choice';

export interface ToolField {
  key: string;
  label: string;
  kind: ToolFieldKind;
  hint?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

/** Isomorphic: safe for the browser, the worker and the prompt builder. */
export interface BlockDefinition<Schema extends z.ZodType = z.ZodType> {
  id: string;
  name: string;
  /** One line for people (pickers, docs). */
  summary: string;
  /** How and when the AI should use this block; goes into the style context layer. */
  aiGuide: string;
  props: Schema;
  fields: ToolField[];
  /** Props for a scene added by hand. */
  defaults: z.infer<Schema>;
  /** Shortest on-screen time, even with a very short narration. */
  minSeconds: number;
  /** Blocks that need a generated picture: which prop holds the prompt and the fixed style added to it. */
  image?: { promptKey: string; style: string; /** Extra picture direction taken from the other props (camera shot, framing). */ compose?: (props: Record<string, unknown>) => string };
  /** Props that must change from one scene to the next (checked as variety). */
  varyBy?: string[];
  /** Sounds that go with this block's own animation (seconds from the scene start); the video adds a sweep between scenes. */
  sfx?: (scene: { props: Record<string, unknown>; ordinal: number; durationSec: number }) => SfxCue[];
  /**
   * Clamp/clean props after the AI or a person edits them. Keeps numeric limits out of the AI schema
   * (not every provider supports them) while still guaranteeing drawable values.
   */
  normalize?: (props: z.infer<Schema>) => z.infer<Schema>;
}

export interface ToolDefinition {
  id: string;
  name: string;
  summary: string;
  /** Version of the engine this tool runs on. */
  version: string;
  /** What the machine needs for this tool to render (shown on the Tools page). */
  requires?: string;
  /** Whether its blocks play live in the storyboard (@remotion/player). */
  previewable: boolean;
  blocks: BlockDefinition[];
}

/** A block together with its tool and full reference. */
export interface ResolvedBlock extends BlockDefinition {
  ref: BlockRef;
  tool: ToolDefinition;
}

export const blockRef = (toolId: string, blockId: string): BlockRef => `${toolId}/${blockId}`;

export function defineBlock<Schema extends z.ZodType>(def: BlockDefinition<Schema>): BlockDefinition<Schema> {
  return def;
}

export function defineTool(def: ToolDefinition): ToolDefinition {
  return def;
}

/** Parse props with the block's schema, then apply its normalizer. */
export function cleanProps(block: BlockDefinition, props: unknown): Record<string, unknown> {
  const parsed = block.props.parse(props);
  return (block.normalize ? block.normalize(parsed) : parsed) as Record<string, unknown>;
}

// ---- rendering (server side) ---------------------------------------------------------------

/** Brand data a renderer needs, with assets already resolved to URLs it can load. */
export interface RenderBrand {
  name: string;
  /** Font family name, e.g. "Baloo2" (bundled in public/fonts). */
  font: string;
  logoSrc: string | null;
  /** Host / mascot picture (URL or data URI), or null. */
  avatarSrc: string | null;
  /** The channel's own intro/outro designs and their AI art (URLs or data URIs); null = fallback design. */
  introDesign: SceneDesign | null;
  outroDesign: SceneDesign | null;
  introArtSrc: string | null;
  outroArtSrc: string | null;
  outroText: string;
  subscribeText: string;
  palette: string[];
}

export interface SceneRenderInput {
  block: BlockRef;
  props: Record<string, unknown>;
  /** 1-based position among scenes using the same block (whiteboard numbers its steps). */
  ordinal: number;
  brand: RenderBrand;
  format: Format;
  width: number;
  height: number;
  durationSec: number;
  /** Narration as a data URI, timed to start shortly after the scene. */
  narrationSrc: string | null;
}

export interface SceneRenderContext {
  outFile: string;
  /** Scratch folder for this scene. */
  workDir: string;
  onProgress?: (fraction: number) => void;
}

/** Server-only half of a tool: renders any of its blocks into an mp4 clip. */
export interface ToolRenderer {
  toolId: string;
  render(input: SceneRenderInput, ctx: SceneRenderContext): Promise<void>;
}
