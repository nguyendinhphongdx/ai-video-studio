---
name: add-job
description: Add a worker job for long or paid work (AI, voice, picture, render). Use whenever work must not run inside a web request.
---

# Add a worker job

Rules: `docs/conventions/05-extension-points.md`, AGENTS.md rules 4, 9, 12.

- [ ] Add the kind to `JobKind` in `src/core/domain/job.ts`.
- [ ] Handler in `src/worker/index.ts`, wired where the other kinds are (`runScopedJob` runs it). The worker has set `ctx()` already: do not pass user or workspace. Only jobs that return data (like `generate_sprites`) keep a result; say so if yours does.
- [ ] A service function validates, enqueues through the job repository, and returns the `Job`. The route returns it; the UI polls `/jobs/:id`.
- [ ] Queueing twice must not pay twice: derive a key from the inputs, or compare the prompt/text hash the files were made for, and skip finished work.
- [ ] Paid calls go through the adapters that record cost; tag with `withUsage({...})` so the ledger knows channel, series, video, job.
- [ ] A job that writes media: files under `data/media`, the worker's `withMedia` pushes them after; code in the web app that writes media calls `storage.put(rel)`, reads call `storage.ensureLocal(rel)`.
- [ ] Vietnamese label for the job in `EpisodeShell` (and the cost screen if it is a new task).
- [ ] Test: enqueue, run the handler with adapters mocked, assert the result and that a second run costs nothing.
- [ ] Real run: stop the container worker first (shared database), run the job, start it again. `npm run check`.
