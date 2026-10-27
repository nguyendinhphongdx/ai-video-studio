// SQLite (node:sqlite, no native build) shared by the Next.js app and the worker.
// WAL lets both processes read while one writes. Migrations run in order, tracked by PRAGMA user_version.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { DATA_DIR, DB_FILE } from './config';

// Append new migrations; never edit one that has shipped.
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
    music TEXT NOT NULL DEFAULT 'music.wav',
    logo_path TEXT,
    default_skill_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE series (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_version INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE series_versions (
    series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    skill_id TEXT NOT NULL,
    bible TEXT NOT NULL,
    format TEXT NOT NULL,
    publish TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (series_id, version)
  );
  CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    series_id TEXT REFERENCES series(id),
    series_version INTEGER,
    number INTEGER,
    topic TEXT NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    skill_id TEXT NOT NULL,
    status TEXT NOT NULL,
    formats TEXT NOT NULL,
    voice TEXT NOT NULL,
    music INTEGER NOT NULL,
    scene_count INTEGER,
    title TEXT NOT NULL DEFAULT '',
    publish TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX episodes_created ON episodes(created_at DESC);
  CREATE UNIQUE INDEX episodes_series_number ON episodes(series_id, number) WHERE series_id IS NOT NULL AND number IS NOT NULL;
  CREATE TABLE scenes (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    slot_id TEXT NOT NULL,
    block TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    narration TEXT NOT NULL,
    props TEXT NOT NULL
  );
  CREATE INDEX scenes_episode ON scenes(episode_id, position);
  CREATE TABLE renders (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration_sec REAL NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE episode_memory (
    episode_id TEXT PRIMARY KEY REFERENCES episodes(id) ON DELETE CASCADE,
    series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    number INTEGER,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    concepts TEXT NOT NULL,
    examples TEXT NOT NULL,
    vocabulary TEXT NOT NULL,
    jokes TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE series_memory (
    series_id TEXT PRIMARY KEY REFERENCES series(id) ON DELETE CASCADE,
    season_summary TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
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
  CREATE INDEX jobs_episode ON jobs(episode_id, created_at DESC);
  CREATE TABLE step_runs (
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    inputs_hash TEXT NOT NULL,
    outputs TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (episode_id, step)
  );
  CREATE TABLE ai_runs (
    id TEXT PRIMARY KEY,
    episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
    series_id TEXT,
    task TEXT NOT NULL,
    task_version INTEGER NOT NULL,
    model TEXT,
    context TEXT NOT NULL,
    sections TEXT NOT NULL,
    prompt TEXT NOT NULL,
    output TEXT,
    error TEXT,
    duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ai_runs_episode ON ai_runs(episode_id, created_at DESC);
  CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    handled_at TEXT,
    error TEXT
  );
  CREATE INDEX outbox_pending ON outbox(handled_at, id);
  CREATE TABLE episode_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    at TEXT NOT NULL,
    message TEXT NOT NULL
  );
  CREATE INDEX events_episode ON episode_events(episode_id, id);
  `,
  `ALTER TABLE renders ADD COLUMN thumbnail_path TEXT;`,
  `ALTER TABLE channels ADD COLUMN description TEXT NOT NULL DEFAULT '';
   ALTER TABLE channels ADD COLUMN font TEXT NOT NULL DEFAULT 'Baloo2';`,
  // Jobs may belong to a series (plan_series) instead of an episode, and may carry a result.
  `
  CREATE TABLE jobs_next (
    id TEXT PRIMARY KEY,
    episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    state TEXT NOT NULL,
    progress REAL NOT NULL DEFAULT 0,
    phase TEXT,
    error TEXT,
    result TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  INSERT INTO jobs_next (id, episode_id, kind, payload, state, progress, phase, error, created_at, started_at, finished_at)
    SELECT id, episode_id, kind, payload, state, progress, phase, error, created_at, started_at, finished_at FROM jobs;
  DROP TABLE jobs;
  ALTER TABLE jobs_next RENAME TO jobs;
  CREATE INDEX jobs_queue ON jobs(state, created_at);
  CREATE INDEX jobs_episode ON jobs(episode_id, created_at DESC);
  `,
  // Existing channels keep the playful intro they had; new ones default to "clean" (set in ChannelInput).
  `ALTER TABLE channels ADD COLUMN intro_look TEXT NOT NULL DEFAULT 'sky';
   ALTER TABLE channels ADD COLUMN avatar_path TEXT;`,
  `ALTER TABLE channels ADD COLUMN image_style TEXT NOT NULL DEFAULT '';`,
  // Each channel owns its intro/outro design (JSON) and optional AI art. intro_look from migration 4 is no longer used.
  `ALTER TABLE channels ADD COLUMN intro_design TEXT;
   ALTER TABLE channels ADD COLUMN outro_design TEXT;
   ALTER TABLE channels ADD COLUMN intro_art_path TEXT;
   ALTER TABLE channels ADD COLUMN outro_art_path TEXT;`,
  // Skills and knowledge belong to a channel. Skills are installed from the market (files) or written by the person or the AI.
  `
  CREATE TABLE channel_skills (
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    markdown TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'custom',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (channel_id, skill_id)
  );
  CREATE TABLE channel_knowledge_versions (
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    markdown TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    PRIMARY KEY (channel_id, version)
  );
  ALTER TABLE episodes ADD COLUMN knowledge_version INTEGER;
  `,
  // Per-scene work: each scene keeps its own picture, voice and approval; production only joins approved scenes.
  `
  ALTER TABLE scenes ADD COLUMN approved INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE scenes ADD COLUMN image_path TEXT;
  ALTER TABLE scenes ADD COLUMN image_hash TEXT;
  ALTER TABLE scenes ADD COLUMN voice_path TEXT;
  ALTER TABLE scenes ADD COLUMN voice_seconds REAL;
  ALTER TABLE scenes ADD COLUMN voice_hash TEXT;
  ALTER TABLE episodes ADD COLUMN auto_images INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE episodes ADD COLUMN auto_voice INTEGER NOT NULL DEFAULT 0;
  `,
  // The assistant: one conversation per thread, every step stored (so a turn can pause for approval and resume).
  `
  CREATE TABLE assistant_threads (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'auto',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE assistant_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL REFERENCES assistant_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tool_calls TEXT NOT NULL DEFAULT '[]',
    tool_call_id TEXT,
    tool_name TEXT,
    status TEXT NOT NULL DEFAULT 'done',
    summary TEXT NOT NULL DEFAULT '',
    data TEXT,
    focus TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX assistant_messages_thread ON assistant_messages(thread_id, id);
  `,
  // Paid-call ledger, price book, budgets. The ledger has no foreign keys: deleting a video keeps what it cost.
  `
  CREATE TABLE usage_events (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    kind TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    channel_id TEXT,
    series_id TEXT,
    episode_id TEXT,
    scene_id TEXT,
    job_id TEXT,
    thread_id TEXT,
    run_id TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    units REAL NOT NULL DEFAULT 0,
    cost_usd REAL,
    estimated INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX usage_at ON usage_events(at);
  CREATE INDEX usage_channel ON usage_events(channel_id, at);
  CREATE INDEX usage_episode ON usage_events(episode_id);
  CREATE TABLE price_book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    provider TEXT,
    pattern TEXT NOT NULL,
    input_per_mtok REAL NOT NULL DEFAULT 0,
    output_per_mtok REAL NOT NULL DEFAULT 0,
    cached_per_mtok REAL NOT NULL DEFAULT 0,
    per_unit REAL NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    channel_id TEXT,
    period TEXT NOT NULL,
    limit_usd REAL NOT NULL,
    mode TEXT NOT NULL DEFAULT 'warn',
    alert_pct INTEGER NOT NULL DEFAULT 80,
    created_at TEXT NOT NULL
  );
  CREATE TABLE usage_prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // App-wide switches (sound effects on/off and level).
  `CREATE TABLE app_prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
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
