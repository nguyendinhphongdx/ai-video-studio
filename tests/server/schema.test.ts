// The Drizzle schema (src/server/schema.ts) matches the tables the SQL migrations build, and the Drizzle client
// reads and writes through the shared node:sqlite connection.
import fs from 'node:fs';

import { eq } from 'drizzle-orm';
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-schema-test-${process.pid}`;
});

let db: typeof import('@/server/db').db;
let orm: typeof import('@/server/orm').orm;
let schema: typeof import('@/server/schema');

beforeAll(async () => {
  fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.AVS_DATA_DIR!, { recursive: true });
  db = (await import('@/server/db')).db;
  orm = (await import('@/server/orm')).orm;
  schema = await import('@/server/schema');
  return () => fs.rmSync(process.env.AVS_DATA_DIR!, { recursive: true, force: true });
});

interface ColInfo { name: string; type: string; notnull: number; pk: number }
const SQL_TYPE: Record<string, string> = { SQLiteText: 'TEXT', SQLiteInteger: 'INTEGER', SQLiteReal: 'REAL', SQLiteBlobBuffer: 'BLOB' };

describe('Drizzle schema', () => {
  it('has exactly the tables and columns the migrations create', () => {
    const tables = (db().prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((r) => r.name).sort();
    const defined = Object.values(schema).map((t) => getTableConfig(t as SQLiteTable));
    expect(defined.map((c) => c.name).sort()).toEqual(tables);
    for (const cfg of defined) {
      // NOT NULL is compared except on a single-column primary key (SQLite reports those loosely).
      const actual = (db().prepare(`PRAGMA table_info('${cfg.name}')`).all() as unknown as ColInfo[]).map((c) => `${c.name} ${c.type.toUpperCase()} ${c.pk && cfg.primaryKeys.length === 0 ? '-' : !!c.notnull}`);
      const mine = cfg.columns.map((c) => `${c.name} ${SQL_TYPE[c.columnType] ?? c.columnType} ${c.primary ? '-' : c.notNull}`);
      expect(mine.sort(), cfg.name).toEqual(actual.sort());
      // Composite primary keys and indexes too.
      const pk = (db().prepare(`PRAGMA table_info('${cfg.name}')`).all() as unknown as ColInfo[]).filter((c) => c.pk).map((c) => c.name).sort();
      const myPk = cfg.primaryKeys.length ? cfg.primaryKeys[0]!.columns.map((c) => c.name).sort() : cfg.columns.filter((c) => c.primary).map((c) => c.name);
      expect(myPk, `${cfg.name} primary key`).toEqual(pk);
      const indexes = (db().prepare(`PRAGMA index_list('${cfg.name}')`).all() as { name: string; origin: string }[]).filter((i) => i.origin === 'c').map((i) => i.name).sort();
      expect(cfg.indexes.map((i) => i.config.name).sort(), `${cfg.name} indexes`).toEqual(indexes);
    }
  });
});

describe('Drizzle client', () => {
  it('writes, reads one row, reads none, and updates', async () => {
    const { appPrefs } = schema;
    await orm().insert(appPrefs).values({ key: 'orm_test', value: '1' });
    expect(await orm().select().from(appPrefs).where(eq(appPrefs.key, 'orm_test')).get()).toEqual({ key: 'orm_test', value: '1' });
    expect(await orm().select().from(appPrefs).where(eq(appPrefs.key, 'missing')).get()).toBeUndefined();
    await orm().update(appPrefs).set({ value: '2' }).where(eq(appPrefs.key, 'orm_test'));
    expect(await orm().select({ v: appPrefs.value }).from(appPrefs).where(eq(appPrefs.key, 'orm_test'))).toEqual([{ v: '2' }]);
  });

  it('refuses a join whose columns share a name instead of mixing their values up', async () => {
    const { users, workspaces } = schema;
    db().prepare("INSERT INTO users (id, email, name, password_hash, is_admin, created_at) VALUES ('u1', 'a@x.vn', 'A', 'h', 0, 'now')").run();
    db().prepare("INSERT INTO workspaces (id, name, uses_shared_keys, user_id, created_at) VALUES ('w1', 'W', 0, 'u1', 'now')").run();
    // Drizzle wraps the driver's error ("Failed query: …"); ours is its cause.
    const err = await orm().select({ u: users.id, w: workspaces.id }).from(users).innerJoin(workspaces, eq(workspaces.userId, users.id)).then(() => null, (e: Error) => e);
    expect(String((err?.cause as Error | undefined)?.message)).toMatch(/same name/);
    expect(await orm().select({ email: users.email, ws: workspaces.name }).from(users).innerJoin(workspaces, eq(workspaces.userId, users.id))).toEqual([{ email: 'a@x.vn', ws: 'W' }]);
  });
});
