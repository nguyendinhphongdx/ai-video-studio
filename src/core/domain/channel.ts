import type { VoiceId } from './catalog';

/** The brand a video is made for: identity for the AI + assets for the renderers. */
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
  /** Background track under public/audio/, or "none". */
  music: string;
  /** Relative media path, or null when no logo was uploaded. */
  logoPath: string | null;
  defaultSkillId: string | null;
  createdAt: string;
  updatedAt: string;
}
