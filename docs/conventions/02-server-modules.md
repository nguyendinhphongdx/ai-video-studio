# 02 Server modules

Every domain area is `src/server/modules/<x>/` with three files (plus extras only when there is a reason):

```text
<x>.types.ts        zod input schemas + their inferred types, constants shared with the UI. No logic, no DB.
<x>.repository.ts   the only code that reads or writes this module's tables.
<x>.service.ts      the use cases: validate, orchestrate repositories and other services, enqueue jobs.
```

Reference: `src/server/modules/series/`.

## Request context, never parameters (rule 9)

Who is acting and in which workspace comes from `ctx()` (`src/server/context.ts`): `ctx().workspaceId`, `ctx().userId`, `ctx().user`, `ctx().role`. The route guard sets it for API requests, the worker sets it for jobs and outbox events.

```ts
// ✗ a function that takes the person or the workspace
async function list(workspaceId: string, userId: string) {}
// ✓ reads the context
async function list(channelId: string) { /* scoped(table) and owner() read ctx() */ }
```

Only `src/server/modules/auth`, the worker's queue and outbox delivery may read across workspaces. Paid calls are tagged with `withUsage({...})`, not by passing ids down.

## Repositories (rules 10, 11)

- Every function is `async`, returns a Promise, and every call is `await`ed (or `void` on purpose).
- Query through Drizzle `orm()`. Every `select/update/delete` has `scoped(table)` in its `where`; every `insert` spreads `...owner()`.
- A row of another workspace is "not found" (404), never 403. Return `null`/empty from the repository; the service throws `notFound(...)`.
- Map rows to domain types in a `to<Thing>` function at the top of the file; the rest of the app never sees a Drizzle row. Parse `jsonb`-as-text with `json(text, fallback)`.
- Joins stay inside one module's repository. Another module's data comes from that module's repository or service, not from reaching into its tables.
- `transaction(async () => …)` holds database calls only, never a network call, a model call or a file write. Inside it `orm()` is the transaction, so repositories join it with no parameter.

```ts
async find(id: string): Promise<Series | null> {
  const r = await orm().select().from(series).where(and(eq(series.id, id), scoped(series))).then(one);
  return r ? toSeries(r) : null;
},
async insert(s: Series) {
  await orm().insert(series).values({ ...s, ...owner() });
},
```

## Services

- Export one object: `export const seriesService = { … }`. Functions are use cases named as verbs (`create`, `saveRules`, `approve`), not CRUD wrappers.
- Validate business rules here (not in the route, not in the repository); throw `ApiError`, `notFound`, `conflict` from `@/server/http/api-error` with a Vietnamese message the person can read.
- A service may call other services and its own repository. It does not call another module's repository for writes.
- Long or paid work is **enqueued** (a job through `job` module), never run in the request (rule 4).
- Return view types (`SeriesView`) built in the service; do not leak Drizzle or database shapes.

## Errors

Throw, do not return error codes. `notFound('series')` → 404, `conflict('…')` → 409, `new ApiError(400, 'validation_error', msg)` for invalid state. The route wrapper turns them into JSON. Messages are for the person: Vietnamese, no stack, no ids.

## Sizing

A service or repository over about 400 lines is a sign to split by use case into a second file in the same module (`character-sprites.service.ts` is the example). **Soft.**

**Checked by:** `npm run lint` (`no-floating-promises`: awaited data layer), `tests/server/workspace-isolation.test.ts` (scoping). Ctx-not-parameters and the repository/service split are **soft** (**Planned:** a lint rule on parameter names in `modules/**`).
