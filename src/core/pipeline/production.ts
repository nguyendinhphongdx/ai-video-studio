import type { Channel } from '../domain/channel';
import type { Episode } from '../domain/episode';
import type { SeriesBible } from '../domain/series';
import type { CoreDeps } from '../ports';
import type { EpisodeFormat, Slot } from '../series/format';
import type { RenderBrand } from '../tools/tool';

/** Shared, read-only state for the production steps of one episode. */
export interface ProductionContext {
  deps: CoreDeps;
  episode: Episode;
  channel: Channel;
  format: EpisodeFormat;
  slots: Slot[];
  bible: SeriesBible | null;
  brand: RenderBrand;
  /** Absolute folder for this episode's generated files. */
  dir: string;
  /** Background music file, or null. */
  music: string | null;
}

export interface VoiceOutput {
  lines: Record<string, { file: string; seconds: number }>;
}

export interface RenderOutput {
  /** Seconds per scene, in scene order. */
  durations: number[];
  clips: Record<string, string[]>;
}

export interface AssembleOutput {
  renders: { format: Episode['formats'][number]; filePath: string; durationSec: number }[];
}

export interface ThumbnailOutput {
  /** Media-relative image path per format. */
  thumbnails: Record<string, string>;
}
