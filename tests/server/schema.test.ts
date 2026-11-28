// The Postgres schema: the generated migrations build every table of src/server/schema.ts, every workspace table
// carries workspace_id and user_id, and transactions roll back as a whole.
import { eq, sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { orm, rowsOf, transaction } from '@/server/db';
import { DATA_TABLES } from '@/server/modules/auth/auth.repository';
import * as schema from '@/server/schema';

const columnsOf = async (table: string) =>
  rowsOf<{ column_name: string }>(await orm().execute(sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table}`)).map((r) => r.column_name).sort();

describe('Postgres schema', () => {
  it('has every table and column of schema.ts after the migrations', async () => {
    for (const t of Object.values(schema)) {
      const cfg = getTableConfig(t as PgTable);
      expect(await columnsOf(cfg.name), cfg.name).toEqual(cfg.columns.map((c) => c.name).sort());
    }
  });

  it('gives every workspace table workspace_id and user_id', async () => {
    for (const t of DATA_TABLES) expect(await columnsOf(t), t).toEqual(expect.arrayContaining(['workspace_id', 'user_id']));
  });
});

describe('transactions', () => {
  it('commits together, and rolls everything back when one part fails', async () => {
    const { appPrefs } = schema;
    await transaction(async () => {
      await orm().insert(appPrefs).values({ key: 'tx_a', value: '1' });
      await orm().insert(appPrefs).values({ key: 'tx_b', value: '1' });
    });
    await expect(
      transaction(async () => {
        await orm().update(appPrefs).set({ value: '2' }).where(eq(appPrefs.key, 'tx_a'));
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await orm().select().from(appPrefs).where(eq(appPrefs.key, 'tx_a'))).toEqual([{ key: 'tx_a', value: '1' }]);
    expect(await orm().select().from(appPrefs).where(eq(appPrefs.key, 'tx_b'))).toHaveLength(1);
  });
});
