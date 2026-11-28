# 01 Layers and dependencies

## The map

```text
src/app  ─►  src/server  ─►  src/core        UI + thin routes → services/adapters → domain, tasks, pipeline
src/features ─► (HTTP) ─► src/app/api         UI never calls the server's code, it calls the API
src/tools    ─►  src/core                      render tools declare blocks against core contracts
src/worker   ─►  src/server, src/core, src/tools/renderers   the only process that renders
remotion/    React components for render and @remotion/player (imported by src/tools and the UI preview)
```

| Layer | May import | Must not import |
| --- | --- | --- |
| `src/core` | itself, `zod` | `next`, `react`, `drizzle-orm`, `remotion`, anything under `@/server`, `@/app`, `@/features`, `@/tools`, `@/worker`, AI SDKs |
| `src/tools` | `@/core`, `@/server/logger`, `@video/*` | other `@/server` code, the DB, the request context |
| `src/server` | `@/core`, `@/tools/registry` | `@/app`, `@/features`, `@/worker`, `@remotion/renderer`, `@/tools/renderers` |
| `src/server/adapters` | ports from `@/core/ports` | the UI, the worker; **only place that imports an AI SDK** (`openai`, `@anthropic-ai/sdk`, …) |
| `src/app` | `@/server/**/*.service`, `*.types`, adapter services such as `media.service`, `@/features/*` (pages) | repositories, `orm`, `db`, `schema`, `drizzle-orm`, the worker, renderers, AI SDKs |
| `src/features`, `src/components` | `@/core` types and pure helpers, `@/lib`, other features' `index.ts`, any `import type` from the server, and values from `@/server/modules/*/*.types` (shared zod schemas and constants) | server values (`*.service`, `*.repository`, adapters, assistant, `db`, `orm`, `schema`, `context`, `config`), the worker, the database, renderers, AI SDKs |
| `src/worker` | everything below it, including `@/tools/renderers` | `@/app`, `@/features` |

The web process never imports `src/tools/renderers.ts` or `@remotion/renderer` (rule 6): they pull in the browser and ffmpeg.

## Why

`core` is the part that must outlive every framework choice and be testable without a database. Each time `core` reaches up, the whole product becomes harder to move and to test. The UI calls HTTP so the same paths serve the browser, the assistant and tests.

## Do

```ts
// src/server/modules/series/series.service.ts (server → core, tools registry)
import type { Series } from '@/core/domain';
import { toolCatalog } from '@/tools/registry';
```

```ts
// src/features/series/services/series.api.ts (UI: types only from the server, data over HTTP)
import type { SeriesView } from '@/server/modules/series/series.service';
import { api } from '@/lib/api/client';
```

## Don't

```ts
// src/core/...  ✗ core importing the server or a framework
import { orm } from '@/server/orm';
import { NextResponse } from 'next/server';
// src/features/... ✗ a screen calling a service directly
import { seriesService } from '@/server/modules/series/series.service';
// src/app/api/... ✗ a route reaching into the database
import { orm } from '@/server/orm';
```

## Features and screens

- A feature folder is a unit: other features import it only through its `index.ts`. Reaching into `@/features/x/components/Y` from another feature is a layer break.
- Two generations of screens exist (`src/features/v2` is the current one, older folders predate it). New work goes in the current set; never extend the older screen, and when a v2 screen replaces one, the older folder is deleted in the same dossier. `v2` importing from the older folders is debt to pay down, not a pattern to copy.

**Checked by:** `npm run lint`: `@typescript-eslint/no-restricted-imports` per layer in `eslint.config.mjs`; the table above is its spec, so change both together. It covers core, tools, UI, routes, server and adapters, AI SDKs, and renderers. Known debt (routes that reach a repository or the database: `health`, `jobs`, `jobs/[id]`) is listed in the config with a comment; never add to that list. **Soft:** feature-to-feature imports through `index.ts` only, and the old/new screen rule; `arch-guard` checks them.
