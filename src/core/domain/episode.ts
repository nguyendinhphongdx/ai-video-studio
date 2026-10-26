import type { Format, VoiceId } from './catalog';

/** "remotion/cards": a block of a tool. */
export type BlockRef = string;

/** One shot. `block` picks the renderer; `props` follow that block's schema. */
export interface Scene {
  id: string;
  /** Format slot this scene fills (e.g. "lesson"); "body" for one-off videos. */
  slotId: string;
  block: BlockRef;
  /** Comes verbatim from the series format; the AI and the editor never change it. */
  locked: boolean;
  narration: string;
  props: Record<string, unknown>;
}

export interface PublishKit {
  youtube: { title: string; description: string; tags: string[] };
  facebook: { post: string };
  tiktok: { caption: string; hashtags: string[] };
}

/** planned: in a series roadmap, no script yet. */
export type EpisodeStatus = 'planned' | 'draft' | 'script_review' | 'producing' | 'video_review' | 'published';

/** A video. Belongs to a series (an episode) or stands alone (seriesId null). */
export interface Episode {
  id: string;
  channelId: string;
  seriesId: string | null;
  /** Series version pinned when the script was written. */
  seriesVersion: number | null;
  number: number | null;
  /** What this video is about, e.g. "Số 5 và những ngôi sao". */
  topic: string;
  /** What viewers should learn or feel. */
  goal: string;
  /** Extra notes from the person. */
  notes: string;
  skillId: string;
  status: EpisodeStatus;
  formats: Format[];
  voice: VoiceId;
  music: boolean;
  /** Desired scene count for one-off videos; null lets the skill decide. */
  sceneCount: number | null;
  title: string;
  scenes: Scene[];
  publish: PublishKit | null;
  createdAt: string;
  updatedAt: string;
}

export interface Render {
  id: string;
  episodeId: string;
  format: Format;
  filePath: string;
  durationSec: number;
  createdAt: string;
}

export interface EpisodeEvent {
  at: string;
  message: string;
}

/** What the series remembers about a finished episode, so later episodes build on it without repeating. */
export interface EpisodeMemory {
  episodeId: string;
  seriesId: string;
  number: number | null;
  title: string;
  summary: string;
  concepts: string[];
  examples: string[];
  vocabulary: string[];
  jokes: string[];
  createdAt: string;
}
