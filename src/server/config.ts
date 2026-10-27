// Filesystem layout of the running app. Everything mutable lives under data/ (gitignored).
import path from 'node:path';

export const ROOT = process.cwd();
export const DATA_DIR = path.resolve(process.env.AVS_DATA_DIR || path.join(ROOT, 'data'));
export const DB_FILE = path.join(DATA_DIR, 'app.db');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const PUBLIC_DIR = path.join(ROOT, 'public');
/** The market: skills shipped with the app, copied into a channel when installed. Not read at runtime by videos. */
export const MARKET_SKILLS_DIR = path.join(ROOT, 'market', 'skills');
export const SEED_DIR = path.join(ROOT, 'seed');

/** Gemini text-to-speech model (also what the price book is matched against). */
export const GEMINI_TTS_MODEL = (): string => process.env.AVS_GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
