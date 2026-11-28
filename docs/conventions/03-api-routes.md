# 03 API routes

Routes live in `src/app/api/v1/<resource>/.../route.ts`. A route validates, calls one service function, returns. Reference: `src/app/api/v1/series/[id]/route.ts`.

```ts
import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { seriesService } from '@/server/modules/series/series.service';
import { SeriesPatch } from '@/server/modules/series/series.types';

export const GET = route<{ id: string }>(async (_req, { id }) => await seriesService.get(id));
export const PATCH = route<{ id: string }>(async (req, { id }) => await seriesService.update(id, await parseJsonBody(req, SeriesPatch)));
```

## Rules

- Wrap every handler in `route()`. It checks the session (401), opens the request context (`ctx()`), runs the handler, and turns thrown errors into JSON. `publicRoute()` is only for sign-up, sign-in, sign-out.
- Input is a zod schema from `<module>.types.ts`, parsed with `parseJsonBody(req, Schema)` for bodies; query strings are read and narrowed in the route (see `usage/events/route.ts`) and anything beyond a few fields gets a schema.
- No business rule, no `orm()`, no repository, no adapter, no model/voice/render call in a route. If you want one, it belongs in a service.
- Long work: the service enqueues a job and returns the `Job`; the UI follows it through `useJob(id)` and the live feed (10 Live updates), not by polling. A route never waits for a model, a voice or a render.
- Return plain data. `undefined` becomes `{ ok: true }`; return a `Response` only for files and streams (`media/[...path]`).
- Paths: plural nouns, nesting for ownership (`/series/:id/rules`), `PUT` to replace, `PATCH` to merge, `POST` for creating or for an action (`/series/:id/write`). Version prefix `v1` stays.
- Errors are thrown (`notFound`, `conflict`, `ApiError`) with Vietnamese messages; never return 403 for a row of another workspace.
- A file over about 40 lines in `route.ts` is doing a service's job. **Soft.**

## Client side of the same endpoint

For each route the UI needs, add one function to `src/features/<f>/services/<f>.api.ts` using `api<T>()` from `@/lib/api/client`, and wrap it in a hook (see 06). The UI never calls `fetch` itself except for media upload and downloads that `api()` cannot express.

**Checked by:** `npm run lint` (routes may not import a repository, `orm`, `db`, `schema` or `drizzle-orm`; three older routes are grandfathered in `eslint.config.mjs`, give them a service function and remove them), `tests/server/*` for the service behind it. "Thin" (no business rule in the route) is **soft**.
