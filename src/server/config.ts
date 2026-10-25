// Filesystem layout of the running app. Everything mutable lives under data/ (gitignored).
import path from 'node:path';

export const ROOT = process.cwd();
export const DATA_DIR = path.resolve(process.env.AVS_DATA_DIR || path.join(ROOT, 'data'));
export const DB_FILE = path.join(DATA_DIR, 'app.db');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const SKILLS_DIR = path.join(ROOT, 'skills');
export const SEED_DIR = path.join(ROOT, 'seed');
