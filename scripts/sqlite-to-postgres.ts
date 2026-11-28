// One-off: copies an install's old SQLite database (data/app.db) into Postgres, table by table, in one transaction.
// Run once, with the app stopped:  npm run db:import-sqlite   (DATABASE_URL picks the target, as for the app)
// Refuses a target that already has accounts. Media and data/settings.json stay where they are.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import postgres from 'postgres';

import { DB_FILE } from '@/server/config';
import { closeDb, dbReady, DEV_DATABASE_URL } from '@/server/db';

/** Parents before children, so every foreign key finds its row. */
const ORDER = [
  'users', 'workspaces', 'memberships', 'sessions', 'invites', 'app_prefs', 'workspace_prefs', 'usage_prefs', 'price_book',
  'channels', 'channel_skills', 'channel_knowledge_versions', 'series', 'series_versions', 'series_memory', 'episodes', 'scenes', 'renders',
  'episode_memory', 'episode_events', 'jobs', 'step_runs', 'ai_runs', 'outbox', 'assistant_threads', 'assistant_messages', 'usage_events', 'budgets',
];
/** Tables whose id is a serial: move the sequence past the copied ids. */
const SERIALS = ['episode_events', 'outbox', 'assistant_messages', 'price_book'];
const BATCH = 500;

async function main() {
  const file = process.argv[2] || DB_FILE;
  if (!fs.existsSync(file)) throw new Error(`No SQLite database at ${file}`);
  await dbReady(); // creates the tables
  await closeDb();
  const lite = new DatabaseSync(file, { readOnly: true });
  const pg = postgres(process.env.DATABASE_URL || DEV_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const [{ n }] = await pg<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM users`;
    if (n > 0) throw new Error('The Postgres database already has accounts; import only into an empty one.');
    const liteTables = new Set((lite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name));
    await pg.begin(async (tx) => {
      for (const t of ORDER) {
        if (!liteTables.has(t)) continue;
        const types = new Map((await tx<{ column_name: string; data_type: string }[]>`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t}`).map((c) => [c.column_name, c.data_type]));
        // SQLite kept JSON as text and flags as 0/1: hand Postgres values of its own types.
        const value = (col: string, v: unknown) => (v === null ? null : types.get(col) === 'jsonb' ? JSON.parse(String(v)) : types.get(col) === 'boolean' ? Number(v) !== 0 : v);
        const rows = (lite.prepare(`SELECT * FROM "${t}"`).all() as Record<string, unknown>[]).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => types.has(k)).map(([k, v]) => [k, value(k, v)])));
        for (let i = 0; i < rows.length; i += BATCH) await tx`INSERT INTO ${tx(t)} ${tx(rows.slice(i, i + BATCH).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, types.get(k) === 'jsonb' && v !== null ? tx.json(v as postgres.JSONValue) : v]))) as Record<string, postgres.ParameterOrJSON<never>>[])}`;
        console.log(`${t.padEnd(28)} ${rows.length}`);
      }
      for (const t of SERIALS) await tx.unsafe(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`);
    });
    console.log('done');
  } finally {
    lite.close();
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
