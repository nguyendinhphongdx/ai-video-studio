// Fixed product catalogs shared by every layer.
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
export const VOICE_IDS = Object.keys(VOICES) as VoiceId[];
export const DEFAULT_VOICE: VoiceId = 'vi-VN-HoaiMyNeural';

export const FPS = 30;

/** Display fonts bundled in public/fonts and loaded by the Remotion blocks. */
export const BRAND_FONTS = {
  Baloo2: { label: 'Baloo 2 (tròn, vui)', file: 'fonts/Baloo2.ttf' },
  PatrickHand: { label: 'Patrick Hand (viết tay)', file: 'fonts/PatrickHand-Regular.ttf' },
} as const;
export type BrandFont = keyof typeof BRAND_FONTS;
export const BRAND_FONT_IDS = Object.keys(BRAND_FONTS) as BrandFont[];

/** Media-store prefix for an uploaded music track in Channel.music. */
export const MEDIA_MUSIC_PREFIX = 'media:';
