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
  // Accounts and workspaces (docs/PLAN-workspaces.md). A workspace owns the data; people join it as owner or member.
  // Sessions and invites store a SHA-256 of the token, never the token.
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uses_shared_keys INTEGER NOT NULL DEFAULT 0,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE memberships (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
  );
  CREATE INDEX memberships_user ON memberships(user_id);
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  `,
  // Every data row belongs to a workspace and records who made it (docs/PLAN-workspaces.md). Existing rows go to the
  // first workspace and first account; on a fresh install with no account yet they stay NULL until the first sign-up
  // adopts them (authRepository.adoptOrphans). Every query filters by workspace_id.
  `
  ALTER TABLE channels ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE channels ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE channels SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX channels_ws ON channels(workspace_id);
  ALTER TABLE series ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE series ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE series SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX series_ws ON series(workspace_id);
  ALTER TABLE series_versions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE series_versions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE series_versions SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX series_versions_ws ON series_versions(workspace_id);
  ALTER TABLE series_memory ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE series_memory ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE series_memory SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX series_memory_ws ON series_memory(workspace_id);
  ALTER TABLE episodes ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE episodes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE episodes SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX episodes_ws ON episodes(workspace_id);
  ALTER TABLE scenes ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE scenes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE scenes SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX scenes_ws ON scenes(workspace_id);
  ALTER TABLE renders ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE renders ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE renders SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX renders_ws ON renders(workspace_id);
  ALTER TABLE episode_memory ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE episode_memory ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE episode_memory SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX episode_memory_ws ON episode_memory(workspace_id);
  ALTER TABLE episode_events ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE episode_events ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE episode_events SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX episode_events_ws ON episode_events(workspace_id);
  ALTER TABLE jobs ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE jobs ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE jobs SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX jobs_ws ON jobs(workspace_id);
  ALTER TABLE step_runs ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE step_runs ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE step_runs SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX step_runs_ws ON step_runs(workspace_id);
  ALTER TABLE ai_runs ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE ai_runs ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE ai_runs SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX ai_runs_ws ON ai_runs(workspace_id);
  ALTER TABLE outbox ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE outbox ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE outbox SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX outbox_ws ON outbox(workspace_id);
  ALTER TABLE channel_skills ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE channel_skills ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE channel_skills SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX channel_skills_ws ON channel_skills(workspace_id);
  ALTER TABLE channel_knowledge_versions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE channel_knowledge_versions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE channel_knowledge_versions SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX channel_knowledge_versions_ws ON channel_knowledge_versions(workspace_id);
  ALTER TABLE assistant_threads ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE assistant_threads ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE assistant_threads SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX assistant_threads_ws ON assistant_threads(workspace_id);
  ALTER TABLE assistant_messages ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE assistant_messages ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE assistant_messages SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX assistant_messages_ws ON assistant_messages(workspace_id);
  ALTER TABLE usage_events ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE usage_events ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE usage_events SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX usage_events_ws ON usage_events(workspace_id);
  ALTER TABLE budgets ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE budgets ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  UPDATE budgets SET workspace_id = (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1);
  CREATE INDEX budgets_ws ON budgets(workspace_id);
  ALTER TABLE price_book ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE price_book ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  CREATE TABLE workspace_prefs (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (workspace_id, key)
  );
  INSERT INTO workspace_prefs (workspace_id, key, value, user_id)
    SELECT (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), 'usage:' || key, value, (SELECT id FROM users ORDER BY created_at LIMIT 1) FROM usage_prefs
    WHERE EXISTS (SELECT 1 FROM workspaces);
  INSERT INTO workspace_prefs (workspace_id, key, value, user_id)
    SELECT (SELECT id FROM workspaces ORDER BY created_at LIMIT 1), key, value, (SELECT id FROM users ORDER BY created_at LIMIT 1) FROM app_prefs
    WHERE key <> 'worker_seen_at' AND EXISTS (SELECT 1 FROM workspaces);
  `,
  // Invite links into a workspace. The link carries a random token; only its SHA-256 is stored.
  `
  CREATE TABLE invites (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    used_by TEXT REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX invites_ws ON invites(workspace_id);
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
