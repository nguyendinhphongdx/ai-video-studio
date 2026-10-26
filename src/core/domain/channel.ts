import type { BrandFont, VoiceId } from './catalog';

/** The brand a video is made for: identity for the AI + assets for the renderers. */
export interface Channel {
  id: string;
  name: string;
  /** What the channel is about, in a sentence or two (for the AI and for people). */
  description: string;
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
  /** Display font for titles and big text in Remotion blocks. */
  font: BrandFont;
  /** Background music: a track under public/audio/ ("music.wav"), an uploaded one ("media:<path>"), or "none". */
  music: string;
  /** Relative media path, or null when no logo was uploaded. */
  logoPath: string | null;
  defaultSkillId: string | null;
  createdAt: string;
  updatedAt: string;
}
