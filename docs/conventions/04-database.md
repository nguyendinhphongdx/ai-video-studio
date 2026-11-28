# 04 Database

Postgres through Drizzle. Tables are defined in `src/server/schema.ts`; migrations in `drizzle/`; the app applies pending migrations when it starts. Tests run on in-memory PGlite, one per test file (`tests/setup.ts`).

## Schema

- Every data table has `workspace_id` and `user_id` (rule 10). A new table is not done until `tests/server/workspace-isolation.test.ts` covers it.
- Column types: times are `timestamptz` read and written as ISO strings through the `isoTime` custom type; JSON is `jsonb` read and written as text through `jsonText`; flags are `boolean`; ids are strings made by `newId()` (`src/core/domain/ids.ts`).
- Names: tables plural `snake_case`, columns `snake_case` in the database and `camelCase` in Drizzle, foreign keys `<thing>_id`.
- Domain types live in `src/core/domain`; the repository maps rows to them. Do not import `typeof table.$inferSelect` outside the repository.
- The cost ledger (`usage_events`) is append-only with no foreign keys on purpose: deleting a video keeps what it cost.
- Series rules are versioned (`series_versions`) and episodes pin the version they were written with (rule 5). Never update a version row; insert a new version.

## Migrations (rule 7)

1. Edit `src/server/schema.ts`.
2. `npm run db:generate` writes the next file into `drizzle/`. Commit the SQL and `drizzle/meta`.
3. Read the generated SQL. drizzle-kit omits the `USING` cast when a column's type changes: add it by hand.
4. **Never edit a migration that has shipped.** A mistake is fixed by a new migration.
5. Data backfills go in the migration SQL (or a one-off script in `scripts/`), not in app start-up code.

## Queries

- Use `orm()` with `scoped(table)` and `owner()` from `src/server/orm.ts`; raw `sql` only when Drizzle cannot say it, still scoped.
- Never concatenate user input into `sql`; use parameters.
- `transaction(async () => …)` holds database calls only.
- Read the minimum columns needed for lists; load heavy `jsonb` fields (scenes, memory) only on detail reads.
- Add an index with the migration that adds the query that needs it, not before.

## Files

Media is files in `data/media`, optionally mirrored to object storage (`S3_BUCKET`). Code keeps working with local paths: code in the web app that writes a media file calls `storage.put(rel)`, code that reads one calls `storage.ensureLocal(rel)` first; a worker job gets its media pulled before it runs and pushed after (`withMedia`) (rule 12).

**Checked by:** `tests/server/schema.test.ts` (migrations apply), `tests/server/workspace-isolation.test.ts`, `no-floating-promises`. CI fails when `npm run db:generate` would produce a change (schema edited without its migration). The `USING` cast and "never edit a shipped migration" are **soft**.
