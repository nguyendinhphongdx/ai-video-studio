// Fixed product catalogs shared by every layer.
export const FORMATS = {
  landscape: { width: 1920, height: 1080, label: 'Ngang 16:9', platforms: 'YouTube · Facebook' },
  portrait: { width: 1080, height: 1920, label: 'Dọc 9:16', platforms: 'TikTok · Reels · Shorts' },
} as const;
export type Format = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as Format[];

export const VOICES = {
  'vi-VN-HoaiMyNeural': 'Hoài My (nữ, miền Bắc) · Edge, miễn phí, giọng máy',
  'vi-VN-NamMinhNeural': 'Nam Minh (nam, miền Bắc) · Edge, miễn phí, giọng máy',
  // Google Gemini TTS: multilingual prebuilt voices that read Vietnamese; needs a Google API key.
  'gemini-Kore': 'Kore (nữ, vững vàng) · Google',
  'gemini-Zephyr': 'Zephyr (nữ, sáng, tươi) · Google',
  'gemini-Leda': 'Leda (nữ, trẻ trung) · Google',
  'gemini-Aoede': 'Aoede (nữ, nhẹ nhàng) · Google',
  'gemini-Charon': 'Charon (nam, thông tin, điềm đạm) · Google',
  'gemini-Orus': 'Orus (nam, chắc chắn) · Google',
  'gemini-Puck': 'Puck (nam, vui tươi) · Google',
  'gemini-Fenrir': 'Fenrir (nam, hào hứng) · Google',
} as const;
export type VoiceId = keyof typeof VOICES;
export const VOICE_IDS = Object.keys(VOICES) as VoiceId[];
export const DEFAULT_VOICE: VoiceId = 'vi-VN-HoaiMyNeural';

/** Voices served by Google Gemini TTS instead of Edge TTS. */
export const isGoogleVoice = (voice: string): boolean => voice.startsWith('gemini-');
/** Whether a voice can be spoken given what the machine offers (see AppConfig.tts / ttsGoogle). */
export const voiceReady = (voice: string, has: { tts: boolean; ttsGoogle: boolean }): boolean => (isGoogleVoice(voice) ? has.ttsGoogle : has.tts);
export const googleVoiceName = (voice: string): string => voice.replace(/^gemini-/, '');

export const FPS = 30;

/** Display fonts bundled in public/fonts and loaded by the Remotion blocks. */
export const BRAND_FONTS = {
  Baloo2: { label: 'Baloo 2 (tròn, vui)', file: 'fonts/Baloo2.ttf' },
  PatrickHand: { label: 'Patrick Hand (viết tay)', file: 'fonts/PatrickHand-Regular.ttf' },
} as const;
export type BrandFont = keyof typeof BRAND_FONTS;
export const BRAND_FONT_IDS = Object.keys(BRAND_FONTS) as BrandFont[];

/** Style of AI pictures when a channel has not written its own (blocks like @remotion/picture). */
export const DEFAULT_IMAGE_STYLE = 'clean modern editorial illustration, cohesive muted palette with one accent colour, soft natural lighting, simple uncluttered composition, wide 16:9 frame, absolutely no text, no letters, no watermark.';

/** Media-store prefix for an uploaded music track in Channel.music. */
export const MEDIA_MUSIC_PREFIX = 'media:';
