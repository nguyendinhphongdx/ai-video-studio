// Drizzle over the same node:sqlite connection as db(). Drizzle has no node:sqlite driver, so this uses its
// sqlite-proxy driver: Drizzle builds the SQL, we run it. Async like the rest of the data layer, so the Postgres
// driver can replace it (docs/PLAN-postgres.md, step 4).
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';

import { db } from './db';
import * as schema from './schema';

type Value = string | number | bigint | null | Uint8Array;

/**
 * node:sqlite (Node 22) returns rows as objects keyed by column name, but Drizzle wants arrays. Two result columns
 * with the same name (a join selecting `a.id` and `b.id`) would collapse into one and shift every value after it, so
 * compare against the statement's real column count (from EXPLAIN, cached per query) and fail loudly instead.
 * Alias one of them (`sql<string>\`${b.id}\`.as('b_id')`) to fix such a query.
 */
const columnCounts = new Map<string, number>();
function columnCount(sql: string): number {
  let n = columnCounts.get(sql);
  if (n === undefined) {
    const plan = db().prepare(`EXPLAIN ${sql}`).all() as { opcode: string; p2: number }[];
    n = plan.find((op) => op.opcode === 'ResultRow')?.p2 ?? 0;
    columnCounts.set(sql, n);
  }
  return n;
}
function toArray(sql: string, row: Record<string, unknown>): unknown[] {
  const values = Object.values(row);
  if (values.length !== columnCount(sql)) throw new Error(`Query returns columns with the same name; alias them: ${sql}`);
  return values;
}

const g = globalThis as unknown as { __avsOrm?: SqliteRemoteDatabase<typeof schema> };

/** The Drizzle database. One per process, like db(); survives Next.js dev hot reloads. */
export function orm(): SqliteRemoteDatabase<typeof schema> {
  g.__avsOrm ??= drizzle(
    async (sql, params, method) => {
      const stmt = db().prepare(sql);
      const args = params as Value[];
      if (method === 'run') {
        stmt.run(...args);
        return { rows: [] };
      }
      if (method === 'get') {
        const row = stmt.get(...args) as Record<string, unknown> | undefined;
        // Drizzle's proxy contract: `get` answers one row as an array, or undefined when there is none.
        return { rows: (row ? toArray(sql, row) : undefined) as unknown as unknown[] };
      }
      return { rows: (stmt.all(...args) as Record<string, unknown>[]).map((r) => toArray(sql, r)) };
    },
    { schema },
  );
  return g.__avsOrm;
}
