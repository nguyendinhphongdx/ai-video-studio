import type { BrandFont, VoiceId } from './catalog';
import type { SceneDesign } from './design';

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
  /** How AI pictures should look for this channel (free text appended to every image prompt of blocks without their own style). */
  imageStyle: string;
  /** This channel's own intro and outro, designed by the AI (null until designed: a plain fallback is drawn). */
  introDesign: SceneDesign | null;
  outroDesign: SceneDesign | null;
  /** Media paths of AI background art for the intro/outro, when the channel chose to generate it. */
  introArtPath: string | null;
  outroArtPath: string | null;
  /** Background music: a track under public/audio/ ("music.wav"), an uploaded one ("media:<path>"), or "none". */
  music: string;
  /** Relative media path, or null when no logo was uploaded. */
  logoPath: string | null;
  /** Host / mascot picture shown in the intro and outro, or null. */
  avatarPath: string | null;
  defaultSkillId: string | null;
  createdAt: string;
  updatedAt: string;
}
