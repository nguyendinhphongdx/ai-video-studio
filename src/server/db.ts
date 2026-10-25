// SQLite (node:sqlite, no native build) shared by the Next.js app and the worker.
// WAL lets both processes read while one writes. Migrations run in order, tracked by PRAGMA user_version.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { DATA_DIR, DB_FILE } from './config';

const MIGRATIONS = [
  `
  CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    audience TEXT NOT NULL,
    style TEXT NOT NULL,
    voice TEXT NOT NULL,
    outro_text TEXT NOT NULL,
    subscribe_text TEXT NOT NULL,
    hashtags TEXT NOT NULL DEFAULT '[]',
    palette TEXT NOT NULL DEFAULT '[]',
    logo_path TEXT,
    default_skill_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    skill_id TEXT NOT NULL,
    idea TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    formats TEXT NOT NULL,
    voice TEXT NOT NULL,
    music INTEGER NOT NULL,
    scene_count INTEGER,
    publish TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX projects_created ON projects(created_at DESC);
  CREATE TABLE scenes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    tool TEXT NOT NULL,
    narration TEXT NOT NULL,
    props TEXT NOT NULL
  );
  CREATE INDEX scenes_project ON scenes(project_id, position);
  CREATE TABLE renders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration_sec REAL NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    state TEXT NOT NULL,
    progress REAL NOT NULL DEFAULT 0,
    phase TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX jobs_queue ON jobs(state, created_at);
  CREATE INDEX jobs_project ON jobs(project_id, created_at DESC);
  CREATE TABLE project_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    at TEXT NOT NULL,
    message TEXT NOT NULL
  );
  CREATE INDEX events_project ON project_events(project_id, id);
  `,
];

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

// One connection per process; survives Next.js dev hot reloads.
const g = globalThis as unknown as { __avsDb?: DatabaseSync };
export function db(): DatabaseSync {
  g.__avsDb ??= open();
  return g.__avsDb;
}

export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    d.exec('COMMIT');
    return out;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export const now = () => new Date().toISOString();
export const json = <T>(text: unknown, fallback: T): T => {
  if (typeof text !== 'string') return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};
