---
name: add-table
description: Add a database table or column. Use for any schema change; covers migration, workspace scoping and the isolation test.
---

# Add a table or column

Rules: `docs/conventions/04-database.md`, AGENTS.md rules 7, 10, 11.

- [ ] Edit `src/server/schema.ts`. Every data table has `workspace_id` and `user_id`. Times `isoTime` (timestamptz as ISO string), JSON `jsonText` (jsonb as text), flags `boolean`.
- [ ] `npm run db:generate`. Open the new file in `drizzle/`: a changed column type needs a hand-written `USING` cast. Never edit a migration that has shipped; if wrong, add a new one.
- [ ] Repository `src/server/modules/<x>/<x>.repository.ts`: async functions, `orm()`, `scoped(table)` in every `where`, `...owner()` in every insert, a `to<Row>` mapper to the domain type. Spread nothing else from `ctx()`.
- [ ] Add the table to `tests/server/workspace-isolation.test.ts`: a row of another workspace is "not found" (404), never 403.
- [ ] `tests/server/schema.test.ts` still passes (migration applies on PGlite).
- [ ] `npm run check`.
