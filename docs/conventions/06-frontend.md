# 06 Frontend

Next.js App Router, React 19, TanStack Query, Zustand, Tailwind, `src/components/ui` primitives (shadcn/radix). Read `node_modules/next/dist/docs/` before writing Next.js code: this version differs from what you remember (AGENTS.md).

## Where things go

```text
src/app/                 routes. A page reads params and mounts one view. No logic.
src/features/<f>/
  index.ts               the only thing other features may import
  views/                 screens: compose components and hooks
  components/            presentational pieces of this feature
  hooks/use-<f>.ts       React Query hooks + key factory
  services/<f>.api.ts    the only place that calls the API for this feature
  lib/                   pure helpers (no React, no fetch)
src/components/ui        primitives (button, dialog…)
src/components/common|brand   shared across features; a component moves here only when a second feature needs it
src/stores/              Zustand, for client-only state that outlives a view (selected channel, assistant panel)
src/lib, src/hooks       generic utilities
src/constants/routes.ts  route paths: no string URLs in components
```

Example page: `src/app/(studio)/direct/[id]/[eid]/[sid]/page.tsx` only reads `useParams` and renders `SceneDirectorView`.

## Data flow

1. `services/<f>.api.ts` has one function per endpoint using `api<T>()` (`src/lib/api/client.ts`); types come from the server module with `import type`.
2. `hooks/use-<f>.ts` wraps them in `useQuery`/`useMutation`. Query keys come from one key factory per feature (`seriesKeys.one(id)`), never inline arrays. A mutation invalidates the keys it changes.
3. Errors: `toast.error(errorMessage(e))` (sonner). Never poll: no `refetchInterval`, no timer that fetches. The live feed refreshes what a change touches ([10 Live updates](10-live-updates.md)); to show a job use `useJob(id)`. Checked by: ESLint.
4. Server state lives in React Query, not in Zustand or `useState`. Zustand is for UI state only.

## Components

- Function components, named exports, one main component per file, file name = component name in PascalCase (`ScenesStep.tsx`); hooks in `use-kebab.ts`.
- `'use client'` only on files that need it (state, effects, browser APIs).
- No data fetching in a presentational component: it receives props.
- Use the primitives in `src/components/ui` and the project's Tailwind tokens (`src/app/styles`); do not add a colour, spacing or font system, and do not add a UI library.
- Every screen has empty, loading, error and success states. State what you saw when you used it (playbook step 5).
- No AI input of a screen's own: a "make it with AI" button asks the assistant (a tool), it does not call a model (rule 3). Direct controls (forms, approve buttons) stay.
- UI text is Vietnamese (rule 8): labels, errors, toasts, empty states. Code, identifiers, comments are English.
- A view over about 300 lines is split into components in the same feature. **Soft.**

## Old and new screens

`src/features/v2` is the current set of screens; older folders (`features/episode` components, `ChannelEditor`…) predate it. Build new work in the current set. Do not copy patterns from the older folder; do not extend it. When a screen is replaced, delete the old one in the same dossier. v2 importing helpers from the old folders (`isBusy`, `status`) is accepted debt, to be moved into `lib/` of the owning feature and imported through its `index.ts`.

## Remotion previews

The UI previews blocks with `@remotion/player` from `remotion/`. A preview must run without any paid call (use the built-in sample picture). The browser never imports `@remotion/renderer`.

**Checked by:** `tsc`, `npm run lint` (UI cannot import server values, the worker, the database or a renderer; see 01), `tests/ui/*` for a few components. Everything else here is **soft**.
