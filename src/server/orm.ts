// Query helpers shared by every repository. The database itself lives in db.ts (`orm()`).
import { eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { ctx } from './context';

export { orm } from './db';

/** The current workspace's rows of a table (AGENTS.md rule 10): `where(and(scoped(episodes), eq(episodes.id, id)))`. */
export const scoped = (table: { workspaceId: PgColumn }): SQL => eq(table.workspaceId, ctx().workspaceId);

/** Who a new row belongs to: spread into every insert of a workspace table. */
export const owner = () => ({ workspaceId: ctx().workspaceId, userId: ctx().userId });

/** The first row of a result, or undefined: `orm().select()…limit(1).then(one)` (the Postgres builder has no `.get()`). */
export const one = <T>(rows: T[]): T | undefined => rows[0];
