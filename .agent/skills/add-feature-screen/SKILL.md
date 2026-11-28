---
name: add-feature-screen
description: Add or change a UI screen in src/features. Use for any page, view, panel or hook the person sees.
---

# Add a screen

Rules: `docs/conventions/06-frontend.md`.

- [ ] Find the feature folder (`src/features/<f>/{components,hooks,services,lib,views}`); a new area gets its own folder with an `index.ts` barrel of what others may import.
- [ ] `services/<f>.api.ts` is the only place that calls `api<T>()`; types come from the server module with `import type`.
- [ ] `hooks/use-<f>.ts`: React Query, keys from one key factory, `toast` on error with `errorMessage(e)`, poll only while a job is running.
- [ ] `views/` compose; `components/` are dumb. Pages under `src/app` only mount a view and read route params.
- [ ] UI text is Vietnamese. No AI input of the screen's own: ask the assistant tool instead (rule 3).
- [ ] Use `src/components/ui` primitives; no new colour or spacing system. A shared component moves to `src/components` only when a second feature uses it.
- [ ] Import another feature only through its `index.ts` (`@/features/episode`), never its internals. New work goes in the screen set the owner is building (`src/features/v2` today); do not extend the older screen it replaces (see 06).
- [ ] Open http://localhost:3300 and use it: empty, loading, error and success states. State what you saw.
- [ ] `npm run check`.
