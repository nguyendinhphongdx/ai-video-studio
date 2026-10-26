import type { EpisodeFormat } from '../series/format';

/** The fixed part of a show: what the AI must keep the same in every episode ("instructions" of the series agent). */
export interface SeriesBible {
  /** One paragraph: what the show is about and why kids watch it. */
  premise: string;
  /** Free-form Markdown instructions, like an AGENTS.md for the show. */
  instructions: string;
  /** Host or mascot, e.g. "Gà Bông, vui vẻ, hay hỏi lại bé". */
  host: string;
  /** Lines that must appear in every episode. */
  catchphrases: string[];
  /** Topics, words or styles the show never uses. */
  avoid: string[];
  /** Uploaded character images (media paths) blocks can reuse. */
  characterAssets: string[];
}

export interface PublishTemplate {
  /** Variables: {series} {n} {topic} {title} {channel}. */
  title: string;
  hashtags: string[];
  /** Appended to every YouTube description. */
  descriptionFooter: string;
}

/** Immutable snapshot of a series' rules. Editing a series creates a new version; episodes pin the one they used. */
export interface SeriesVersion {
  seriesId: string;
  version: number;
  skillId: string;
  bible: SeriesBible;
  format: EpisodeFormat;
  publish: PublishTemplate;
  createdAt: string;
}

export interface Series {
  id: string;
  channelId: string;
  name: string;
  status: 'active' | 'archived';
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}
