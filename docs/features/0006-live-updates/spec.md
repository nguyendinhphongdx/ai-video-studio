---
id: 0006
title: One live-update channel instead of polling
status: building # draft -> approved -> building -> delivered (or dropped)
owner: phongnd
size: large
touches: [server, worker, db, ui, docs]
created: 2026-11-28
---

# One live-update channel instead of polling

## Problem
The screens learn that something changed by asking again and again. Eleven places poll on their own timer (0,9s to 15s), three of them forever, even when nothing runs: the project page asks for the project every 4 s, every page asks for the app config every 15 s, the cost page asks every 15 s. Three hooks poll the same `/jobs/:id` under different keys, and a running episode is fully re-read every 1,5 s just to move a progress bar. The chat reads the database every 100 ms per open connection. It is heavy, scattered, and each new screen invents its own timer.

## Outcome
One live connection per open tab (the chat's token stream is a second one only while a chat turn runs). When the worker or a request changes something, the server sends a tiny signal ("job 7: 40%, đang vẽ ảnh", "tập 12 đổi", "dự án đổi") and the screen refreshes only what that signal touches. Progress bars move from the signal itself, with no extra request. No screen sets its own timer. If the connection is lost, the tab says nothing is wrong, reconnects, and refreshes what it shows once; if live updates cannot work at all, one slow safety refresh (30 s) keeps screens correct.

## Design
Three parts, each small. The worker is a separate process from the web server and holds no browser connection, so it cannot push directly: it writes a row, and the web process that holds the connections picks the row up and pushes it into each tab's open connection (server-sent events: one-way, over plain HTTP, the browser reconnects by itself).

1. **Change log.** A table `changes` (id, workspace, topic, ref, data, at). The repository function that writes the data appends the row in the same transaction (a repository cannot forget it; a service can): `job` (state, progress, phase), `episode`, `project`, `series`, `usage`, `skill`, `knowledge`, `member`. Only writes that change what a person sees send a signal: bookkeeping such as `episodeRepository.touch` never does. Rows older than a day are deleted by the worker. Same idea as the existing `outbox` and the assistant's `events`, so no new kind of thing.
2. **One feed.** `GET /api/v1/changes` (server-sent events, `Last-Event-ID` to catch up). Each web process runs one loop that reads new rows and hands them to every connected tab of that workspace, so the cost is one query per process, not per tab. The loop must not lose a row whose transaction commits late (a smaller id can appear after a larger one): it re-reads a short overlapping window and drops what it already sent. Signals are idempotent, so a repeat is harmless and a miss is not. The connection re-checks that the person still belongs to the workspace on every heartbeat and closes if not. The assistant's token stream keeps its own table (it is high volume) but is served by the same loop instead of one database reader per connection.
3. **One client hook.** When the connection opens (first time or after a drop) it refreshes the active queries once, so a change made between loading the page and connecting is not missed. `useLiveChanges()` mounted once in the studio layout. A table maps a signal to query keys (`job` → `['job', id]` and the episode that owns it, `episode` → `episodeKeys.one(id)` and its lists, `project` → `['channel', id]`, `usage` → usage summaries). Job progress is written straight into the cache with `setQueryData`; everything else is `invalidateQueries`. Every `refetchInterval` in the app is removed. A reconnect invalidates the active queries once.

Cost of what is polled today is replaced by: one open connection per tab, one read per process, and a refetch only when something actually changed.

## Scope
- In: `changes` table and cleanup; writing rows where jobs, episodes, projects, series and usage change; the feed route; `useLiveChanges`; removing all `refetchInterval`s (listed in the plan); one `useJob(id)` replacing three job polls; chat thread refreshes from the same signals instead of polling every 0,9 s while it still shows the token stream.
- Out (on purpose): folding the chat's token stream into the feed connection (follow-up; until then a tab holds the feed plus the chat stream while a turn runs, and on plain HTTP/1.1 in local dev three busy tabs reach the browser's 6-connection limit, which HTTPS/HTTP2 does not have); WebSocket; push to other devices or e-mail; changing what the screens show; changing how jobs run; a message broker (Redis, Postgres LISTEN/NOTIFY) — the table works anywhere the app already runs.

## Acceptance
- [ ] With the studio open and nothing running, the browser makes no repeating requests (network tab quiet for 60 s).
- [ ] Starting a render moves the progress bar and finishes the screen with no manual reload, using one connection and no per-job polling.
- [ ] Killing the connection for 20 s and restoring it brings the screen up to date by itself.
- [ ] With the feed blocked, screens still update within 30 s.
- [ ] A tab only receives signals of its own workspace (test with two workspaces).
- [ ] Tests: signal → query keys map; feed catch-up from `Last-Event-ID`; workspace isolation; cleanup of old rows.

## Constraints
- New table: use the `add-table` skill (migration, `workspace_id`, isolation test).
- Every read and write workspace-scoped; the feed never sends another workspace's rows.
- Signals carry ids and small numbers only. The one text is a job's `phase`, a progress label of at most 80 characters that `/jobs/:id` already serves to the same workspace. Never user or AI content beyond that.
- Worker writes must not slow a render: progress rows are limited to one per job per second.
- No paid calls.

## Decisions
Owner approved: one connection per tab with the server pushing signals into it; phased as below; the 30 s safety refresh stays only as a fallback when the feed is down.

- **Step 1** (small, useful alone): remove the three always-on timers (project 4 s, config 15 s, usage 15 s) in favour of refresh after the actions that change them, and merge the three `/jobs/:id` polls into one `useJob(id)`.
- **Step 2**: `changes` table, feed, `useLiveChanges`, then remove the remaining timers and make the chat thread follow the same signals.
