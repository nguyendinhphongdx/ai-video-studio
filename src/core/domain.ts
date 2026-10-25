// Domain model shared by the app, the worker and the CLI. No framework imports here.

export const FORMATS = {
  landscape: { width: 1920, height: 1080, label: 'Ngang 16:9', platforms: 'YouTube · Facebook' },
  portrait: { width: 1080, height: 1920, label: 'Dọc 9:16', platforms: 'TikTok · Reels · Shorts' },
} as const;
export type Format = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as Format[];

export const VOICES = {
  'vi-VN-HoaiMyNeural': 'Hoài My (nữ, miền Bắc)',
  'vi-VN-NamMinhNeural': 'Nam Minh (nam, miền Bắc)',
} as const;
export type VoiceId = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceId = 'vi-VN-HoaiMyNeural';

export const FPS = 30;

/** A channel is the brand a video is made for: identity for the AI + assets for the renderers. */
export interface Channel {
  id: string;
  name: string;
  /** Who watches; the AI writes for them. */
  audience: string;
  /** Tone and wording rules for the AI. */
  style: string;
  voice: VoiceId;
  outroText: string;
  subscribeText: string;
  hashtags: string[];
  /** Brand colours, first one is the main colour. */
  palette: string[];
  /** Relative path inside the media store, or null when no logo was uploaded. */
  logoPath: string | null;
  defaultSkillId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One shot of the video. `tool` picks the renderer; `props` follow that tool's schema. */
export interface Scene {
  id: string;
  tool: string;
  narration: string;
  props: Record<string, unknown>;
}

export interface PublishKit {
  youtube: { title: string; description: string; tags: string[] };
  facebook: { post: string };
  tiktok: { caption: string; hashtags: string[] };
}

export type ProjectStatus = 'draft' | 'script_review' | 'producing' | 'video_review' | 'published';

export interface Project {
  id: string;
  channelId: string;
  skillId: string;
  idea: string;
  title: string;
  status: ProjectStatus;
  formats: Format[];
  voice: VoiceId;
  music: boolean;
  /** Desired scene count; null lets the skill decide. */
  sceneCount: number | null;
  scenes: Scene[];
  publish: PublishKit | null;
  createdAt: string;
  updatedAt: string;
}

export interface Render {
  id: string;
  projectId: string;
  format: Format;
  /** Relative path inside the media store. */
  filePath: string;
  durationSec: number;
  createdAt: string;
}

export type JobKind = 'write_script' | 'revise_script' | 'produce';
export type JobState = 'queued' | 'running' | 'done' | 'failed';

export interface Job {
  id: string;
  projectId: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  state: JobState;
  progress: number;
  /** Machine-readable step inside the job, e.g. "voice" or "render:landscape:3". */
  phase: string | null;
  /** Short message safe to show to the person. */
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ProjectEvent {
  at: string;
  message: string;
}

/** Error whose message is short, in Vietnamese and safe for the UI; `detail` is for logs only. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
  }
}
