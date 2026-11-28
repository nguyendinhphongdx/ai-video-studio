---
spec: 0006
status: approved # draft -> approved -> done
---

# Plan: One live-update channel instead of polling

## Approach
Extension point: "React to something" in `docs/conventions/05-extension-points.md`, widened by one new table. A change is a row (`changes`) written where the change happens, exactly like `outbox` and the assistant's `assistant_stream_events`; the web process turns rows into server-sent events. No new provider, no new job kind, no broker. Delivered in the two steps fixed in the spec's Decisions. Step 1 ships alone and touches no server code. Step 2 is the table, feed, hook and the removal of what is left.

Read first and copy the shape of:
- `src/server/modules/assistant/assistant.stream.ts` (SSE `Response`, `retry:` padding, heartbeat, `Last-Event-ID`, context captured with `ctx()` and re-entered by `runWithContext`) and its route `src/app/api/v1/assistant/threads/[id]/events/route.ts`.
- `src/server/modules/outbox/outbox.repository.ts` and `outbox` in `src/server/schema.ts` (serial id, `isoTime`, `workspace_id`/`user_id`, index).
- `src/features/assistant/hooks/use-live-turn.ts` (EventSource hook, invalidate on events).
- `src/features/episode/hooks/use-episode.ts` (key factory, `isBusy`) and `src/server/modules/job/job.repository.ts` (`progress`, `finish`, `fail`, `claimNext`, `failInterrupted`).

## Steps

### Step 1 (shippable alone): no always-on timers, one `useJob`
Server untouched. Every refetch that the three timers gave is replaced by a refresh after the thing that changes it.

1. [x] Add `useJob(id)` in `src/features/app/hooks/use-job.ts` (export from `src/features/app/index.ts`), key `['job', id]`, one `jobApi.get` in `src/features/app/services/app.service.ts`. It polls 1.5 s only while the job is `queued`/`running` (temporary, removed in step 2). When the job reaches `done` or `failed` it invalidates once: `['channel']`, `queryKeys.channels`, `queryKeys.config`, `['usage']`, `['episodes']`, `['episode']`, `['drawing']`, `['logo-draft']`. — files: the two above plus the index — proof: on screen (the repo has no hook-testing library, so no unit test here): finish a job and watch the keys of `JOB_AFFECTS` refetch once in the Query devtools.
2. [x] Replace the three job polls with `useJob`: `ChannelArtPanel.tsx` (`['channel-job']`, 1.2 s), `BibleEditor.tsx` (`['sprite-job']`, 1.5 s), `v2/views/SetupChecklist.tsx` (`['job']`, 2 s). Delete `channelApi.job` and `seriesApi.job` (and the unused `skillApi.job` if still unused) once nothing calls them. — proof: draw art, draw sprites and draw from the checklist on screen; one `/jobs/:id` request per 1.5 s, one key per job in the Query devtools.
3. [x] Remove the project and usage timers, and slow the config timer to 30 s until the `worker` signal exists (step 2 item 10 removes it): `SystemStatus` shows "worker chưa chạy" from `worker.alive`, which only the config poll keeps fresh. `refetchOnWindowFocus` is `false` globally in `src/providers/providers.tsx`, so the replaced queries set `refetchOnWindowFocus: true` themselves. Name what refreshes each:
   | Timer | Replacement in step 1 |
   | --- | --- |
   | `useChannel` 4 s (`use-channels.ts`) | `useChannelAction` already sets data; `useJob` done; assistant turn end (item 4); window focus |
   | `useAppConfig` 15 s (`use-app.ts`) | `useEpisodeAction` already invalidates it; `useJob` done; assistant turn end; window focus; **kept at 30 s** until step 2 item 10 |
   | `useUsageSummary` 15 s (`use-usage.ts`) | `useEpisodeAction` and `useJob` done invalidate `['usage']`; assistant turn end; window focus |
   — proof: network tab quiet for 60 s on a project page with nothing running.
4. [x] Assistant turn end refreshes what the turn may have changed: in `use-assistant.ts`, when `running` goes true to false, invalidate the same set as item 1 (done by adding `usage`, `drawing`, `logo-draft` to its `DATA_KEYS`). — proof: ask the assistant to draw a logo, the project page shows it without reload.

### Step 2: `changes` table, feed, `useLiveChanges`
Order: data, core, server, route, client, removals.

5. [x] **Data.** Add table `changes` to `src/server/schema.ts`: `id serial pk`, `topic text`, `ref text`, `data jsonText`, `at isoTime`, `workspaceId`, `userId` (same references as `outbox`), indexes `changes_ws` on `workspaceId` and `changes_at` on `at`. Topics: `job`, `episode`, `project`, `series`, `usage`, `skill`, `knowledge`, `member`. `npm run db:generate` (expected name `drizzle/00NN_*.sql`, new table only, no `USING`). Follow `.agent/skills/add-table`. — proof: `tests/server/schema.test.ts` green.
6. [x] **Module** `src/server/modules/changes/`: `changes.types.ts` is the one catalog of topics and their `data` shapes (zod `Signal`; UI and server import it; `worker` and `reset` are hub-made frames that are never stored). Data holds ids and numbers, plus the job's `phase` label of at most 80 characters, `changes.repository.ts` (`add(topic, ref, data)` scoped with `owner()`; `after(id, limit)` unscoped by design; `latestId()`; `prune(olderThan)` unscoped), `changes.service.ts` (`feed(lastEventId, signal)`). — proof: `tests/server/changes.test.ts`.
7. [x] **Write rows where things change**, in the repository function that does the write. Most writes are not in a `transaction()` today (`touch`, `updateScene`, `jobRepository.finish`, …), so each listed function wraps its write and its `changes.add` in one `transaction()` explicitly:
   - `job.repository.ts`: `insert`, `claimNext` (`jobQueue`, uses the job row's own workspace and user explicitly), `progress`, `finish`, `fail`, `failInterrupted` write topic `job`, ref job id, data `{ state, progress, phase, kind, episodeId, channelId?, seriesId?, threadId? }` (ids copied from the job and its payload). `progress` writes at most one row per job per second and always on a phase change (small in-memory map in the worker process; state changes are never throttled).
   - `episode.repository.ts`: only writes that change what a person sees signal `episode` with `{ channelId, seriesId }`. `touch` never signals (the worker calls it on every progress write; signalling it would refetch a whole episode about twice a second during a render). A test asserts that a progress write leaves no `episode` row.
   - `skill`, `knowledge` and member repositories write `skill`, `knowledge`, `member` (the assistant or an outside AI editing them must update an open screen).
   - `channel.repository.ts` writes `project`; `series.repository.ts` writes `series`; `usage.repository.ts` insert of a ledger event writes `usage`.
   — proof: `tests/server/changes.test.ts` (each write leaves one row with the writer's workspace; progress throttle).
8. [x] **Feed route** `src/app/api/v1/changes/route.ts` (about 8 lines, `route()`, `dynamic = 'force-dynamic'`, reads `Last-Event-ID`, calls `changesService.feed`). Stream in `changes.stream.ts`, same shape as `assistant.stream.ts`: padding, `retry: 1000`, beat every 15 s, `id:` = row id. A new tab without `Last-Event-ID` starts at `latestId()` (no history). If the given id is older than the oldest kept row it sends one `reset` event.
   - **No lost rows:** `id` is a serial, so a transaction that commits late can show a row with an id below the cursor. Each poll reads `at >= lastPoll - 5 s` ordered by id and drops ids already sent (a bounded set kept for 10 s); the cursor is only a hint. A tab joining with `Last-Event-ID` gets its own catch-up query (`id > given`), then joins the hub; a row sent twice is harmless because signals are idempotent.
   - **Still allowed:** the connection re-checks `authService.contextFor` at each heartbeat and closes when the person no longer belongs to the workspace or the session ended.
   - **Closing:** every `enqueue` is guarded by a `closed` flag and a try/catch, so a write after the reader left cannot throw `Controller is already closed` (the public site's log shows that error today, likely from the chat stream; fix it there too in item 13).
   - **Bounded connections:** one hub per web process (module singleton on `globalThis`, survives Next dev reload) holding a `Set` of subscribers. The one reader loop runs only while the set is not empty: every 500 ms one query `after(cursor)`, then fan out in memory; zero subscribers stops it. Cost is one query per process per 500 ms, not per tab. One feed connection per tab, plus the chat stream while a turn runs (folding the chat into the feed is a follow-up, see the spec).
   - **Isolation:** each subscriber captures `ctx().workspaceId` when it connects (route runs inside `route()`); the hub sends a row only when `row.workspaceId === subscriber.workspaceId`. The unscoped `after()` is the single new cross-workspace read, so `AGENTS.md` rule 9 gets one more exception named there (owner's yes, see below).
   — proof: tests below, plus `curl -N` against two logged-in sessions.
9. [x] **Cleanup:** worker deletes rows older than a day with `changesRepository.prune()`, run from a `setInterval(...).unref()` hourly next to the heartbeat in `src/worker/index.ts`. — proof: test with old and new rows.
10. [x] **Worker health signal** (replaces the 15 s config poll for `worker.alive`): the hub reads `prefsService.workerSeenAt()` in its loop every 5 s, only while subscribed, and emits a `worker` signal (not a row, not workspace-bound) when alive flips. Client maps it to `queryKeys.config`. — proof: stop the worker, the red banner (`SystemStatus.tsx`) appears within about 20 s with no request loop.
11. [x] **Client hook** `useLiveChanges()` in `src/features/app/hooks/use-live-changes.ts`, pure map in `src/features/app/lib/live-signals.ts` (no React, easy to test), mounted once in `src/app/(studio)/layout.tsx` via a tiny client component. Behaviour:
    - `job` signal: `setQueryData(['job', id])`; patch `job` of the matching episode in `episodeKeys.one(episodeId)`, `episodeKeys.list(channelId)` and `seriesKeys.episodes(seriesId)` when cached; on a terminal state also invalidate the keys from step 1 item 1, plus `['assistant-thread', threadId]` for `assistant_turn`, `['drawing', seriesId]`, `['logo-draft', channelId]`.
    - `episode` invalidates `episodeKeys.one(ref)`, `episodeKeys.list(channelId)`, `seriesKeys.episodes(seriesId)`; `project` invalidates `['channel', ref]` and `queryKeys.channels`; `series` invalidates `seriesKeys.one(ref)` and list; `usage` invalidates `['usage']`; `worker` and `reset` invalidate config and everything active.
    - Invalidations are batched in a 300 ms window. When the connection opens (first time or after a drop) it invalidates the active queries once.
    - Reconnect (open after an error) invalidates active queries once. If the feed has been down for more than 10 s, one 30 s safety interval invalidates active queries, and stops when the feed is back.
    — proof: `tests/ui/live-signals.test.ts` (signal to keys), `tests/ui/use-live-changes.test.tsx` (fake `EventSource`: reconnect invalidates once, down feed triggers the 30 s refresh with fake timers).
12. [x] **Remove every remaining `refetchInterval`** (all 10 left after step 1):
    | File | Was | Replaced by |
    | --- | --- | --- |
    | `episode/hooks/use-episode.ts` `useEpisode` | 1.5 s while busy | `job` patch + `episode` signal |
    | same, `useEpisodes` | 3 s while busy | `job` patch + `episode` signal |
    | `series/hooks/use-series.ts` `useSeriesEpisodes` | 2.5 s | `job` patch + `episode` signal |
    | `assistant/hooks/use-assistant.ts` `useThread` | 0.9 s while running | `job` of kind `assistant_turn` invalidates `['assistant-thread', threadId]`; the step 1 item 4 invalidation is deleted |
    | `app/hooks/use-job.ts` `useJob` | 1.5 s (from step 1) | `job` signal `setQueryData` |
    | `v2/views/LogoDraft.tsx` `useLogoDraft` | 2 s / 15 s | `job` (generate_art, channelId) + `project` |
    | `v2/views/CastEditor.tsx` drawing | 2 s / 15 s | `job` (sprites and library, seriesId) + `series` |
    The `isBusy` helper stays (it drives UI, not timers). — proof: `grep -rn refetchInterval src` returns only the 30 s fallback in `use-live-changes.ts` (it is an interval of its own, not a query option).
13. [ ] **(Not done, owner may drop or schedule it)** **Chat token stream served by the same loop.** `assistant.stream.ts` `eventStream` stops running its own `eventsAfter` loop every 100 ms per connection: the hub also reads `assistant_stream_events` after its own cursor (only while a subscriber of kind "thread" exists) and fans out by `threadId` and workspace. `eventSink` and the route contract (`Last-Event-ID`, replay from start) do not change. This is the riskiest item and the only one that changes working behaviour, so it is a separate review and can be dropped without breaking the rest. — proof: `tests/server/assistant-stream.test.ts` still green (add a case for two readers of one thread sharing one query); on screen a long answer streams token by token and a reload mid-turn replays it.
14. [x] **Keep it from coming back:** an ESLint `no-restricted-syntax` rule for the `refetchInterval` property under `src/features` (allowed only in `use-live-changes.ts`), change `docs/conventions/06-frontend.md` rule 3 ("Poll only while a job is running") to "never poll: live signals", add the `changes` table and feed to `docs/ARCHITECTURE.md`, and AGENTS.md rule 9 exception. — proof: `npm run lint` fails on a test `refetchInterval`.

## Files touched
| Area | File | Change |
| --- | --- | --- |
| UI | `src/features/app/hooks/use-job.ts`, `src/features/app/services/app.service.ts`, `src/features/app/index.ts` | new `useJob` (step 1) |
| UI | `ChannelArtPanel.tsx`, `BibleEditor.tsx`, `v2/views/SetupChecklist.tsx` | use `useJob` |
| UI | `channel.api.ts`, `series.api.ts`, `skill.api.ts` | drop `job` |
| UI | `use-channels.ts`, `use-app.ts`, `use-usage.ts` | remove timers (step 1) |
| UI | `use-assistant.ts` | turn-end refresh (step 1), then signal-driven (step 2) |
| UI | `use-episode.ts`, `use-series.ts`, `LogoDraft.tsx`, `CastEditor.tsx` | remove timers (step 2) |
| UI | `use-live-changes.ts`, `lib/live-signals.ts`, `src/app/(studio)/layout.tsx` | new hook, map, mount |
| Server | `src/server/schema.ts`, `drizzle/00NN_*.sql` + `meta` | `changes` table |
| Server | `src/server/modules/changes/*` | types, repository, service, stream hub |
| Server | `job`, `episode`, `channel`, `series`, `usage` repositories | append a signal row with each write |
| Server | `assistant.stream.ts` | read through the hub (item 13) |
| Route | `src/app/api/v1/changes/route.ts` | feed |
| Worker | `src/worker/index.ts` | hourly prune |
| Tests | `tests/server/changes.test.ts`, `tests/server/workspace-isolation.test.ts`, `tests/ui/*` | see Proof |
| Docs | `AGENTS.md`, `docs/conventions/06-frontend.md`, `docs/ARCHITECTURE.md`, `eslint.config.mjs` | rule and check |

## Data
Step 1: none. Step 2: new table `changes` (`id`, `topic`, `ref`, `data`, `at`, `workspace_id`, `user_id`), migration generated as `drizzle/00NN_changes.sql` (new table only, no column type change, so no `USING`). Isolation test: add `changes` to `tests/server/workspace-isolation.test.ts` (rows of workspace A are not returned to a subscriber of B, and carry the writer's workspace and user). No data kept longer than a day.

## Paid calls and jobs
none. No new job kind, no AI, picture or voice call. Existing jobs only gain a signal row.

## Risks
- **Worker speed:** one extra insert per job state change and at most one per second per job for progress (item 7). Failure to write a signal must not fail the job: the repository write sits in the same transaction as the change, so an error there is a real error; if that proves noisy, wrap `progress` signals in a caught write, as `eventSink` does.
- **Missed signal:** a row written between reader polls is still caught (cursor by id). A process restart loses nothing (rows persist); tabs reconnect and invalidate. The 30 s fallback covers a dead feed.
- **Proxies buffering SSE:** same padding and `x-accel-buffering: no` as the chat stream, which already works in this deployment.
- **Browser connection limit (6 per origin on HTTP/1.1):** one feed plus the chat stream per tab; three tabs chatting at once reach it on plain HTTP in local dev. HTTPS/HTTP2 (the public site) has no such limit. Folding the chat into the feed removes the issue and is the named follow-up.
- **Interim in step 1:** a change made by the worker without this tab having started it (another tab, a scheduled job) shows only on the next focus or action until step 2. Accepted because step 2 follows.
- **Item 13** touches the working chat stream; isolated so it can be reverted alone.
- **Undo:** step 1 is a plain revert of UI hooks. Step 2: revert the commits; the `changes` table is additive and harmless if left behind (drop it in a new migration, never edit the shipped one).

## Proof
- Tests added: `tests/ui/live-signals.test.ts` (signal to query keys); `tests/ui/use-live-changes.test.tsx` (reconnect, 30 s fallback); `tests/server/changes.test.ts` (rows per write, progress throttle, catch-up from `Last-Event-ID`, `reset` for a too-old id, cleanup of old rows, one reader for many subscribers); `workspace-isolation` (two workspaces).
- Acceptance lines on screen at http://localhost:3300:
  - Quiet network 60 s: project page and episode page, nothing running, network tab shows only the open feed (after step 1: no repeating requests except the one running job).
  - Render: start a render, progress moves with only the feed in the network tab and the screen finishes without reload.
  - Connection loss: block `/api/v1/changes` in devtools for 20 s, unblock, screen is current.
  - Feed blocked: keep it blocked, change something from another tab, the first tab updates within 30 s.
  - Two workspaces: two sessions, a job in one produces no event frames in the other (`curl -N`).
- Real worker job: run a real episode render and an art draw through `npm run dev`, watching the Query devtools and the worker log.
- `npm run check` green after every item.

## Needs the owner's yes
1. **AGENTS.md rule 9** lists who may read across workspaces (auth, `jobQueue`, outbox delivery). The feed hub's `changes` reader and `prune` need to be added.
2. **Signals written in repositories**, not in services as the spec words it: there are 11 episode writes, and a repository is the one place that cannot be skipped. Say no if you want them in services.
3. **Worker alive banner** was kept fresh by the 15 s config poll, which the spec did not name. Item 10 adds a `worker` signal from the hub (a read of the heartbeat every 5 s while a tab is open). Without it the banner would go stale.
4. **ESLint rule against `refetchInterval`** (item 14) and the rewrite of the frontend convention line.
