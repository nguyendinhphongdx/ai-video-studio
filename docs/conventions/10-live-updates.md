# 10 Live updates

Dossier: [0006](../features/0006-live-updates/spec.md). The screens never ask "has it changed?" on a timer. Whatever changes something says so once, and every open tab hears it.

## The shape

```text
service or worker ──publish(topic, ref, data)──► changes table ──► one reader loop per web process ──► SSE of each tab ──► useLiveChanges ──► query cache
```

One vocabulary (topics), one way to send, one way to receive. There is no second path.

## Topics: the catalog

`src/server/modules/changes/changes.types.ts` lists every topic with the shape of its `data` (zod). The UI imports it as a shared `*.types` file, like other modules, so a topic cannot be sent that nobody can read.

| Topic | `ref` | `data` (ids and small numbers only) |
| --- | --- | --- |
| `job` | job id | `state`, `progress`, `phase` (progress label, at most 80 characters), `kind`, `episodeId?`, `channelId?`, `seriesId?`, `threadId?` |
| `episode` | episode id | `channelId`, `seriesId?` |
| `project` | project id | none |
| `series` | series id | `channelId` |
| `usage` | project id or none | none |
| `skill`, `knowledge`, `member` | project id | none |

`worker` (the worker's heartbeat changed) and `reset` (a reconnecting tab's position is too old) are frames the hub makes itself; they are never stored.

Adding a topic: add it to the catalog, add its query keys to the UI map (below), add the sender. A test fails if a topic has no UI map entry.

## Sending (server and worker)

```ts
// in the service, in the same transaction as the write
await changes.add('episode', episode.id, { channelId: episode.channelId });
```

- The repository function that writes the data calls `changes.add`, inside one `transaction()` with the write (many writes are not in a transaction today, so wrap them explicitly). A repository cannot forget it; a service can. Services, routes, `core` and `tools` do not call it. `core` workflows already report through callbacks (`progress`); the worker turns those into `job` signals.
- Only a write that changes what a person sees signals. Bookkeeping (`episodeRepository.touch`) never does.
- The workspace comes from the request context. It is never a parameter and never taken from `data`.
- `data` carries ids and small numbers. The one text is a job's `phase`, at most 80 characters, which `/jobs/:id` already shows to the same workspace. Never put user or AI content in `data`.
- One signal per change. Do not add per row inside a loop; add once for the batch. `job` progress is limited to one per job per second by `add` itself.
- The reader loop re-reads a short overlapping window and drops rows it already sent, because a transaction that commits late can carry a smaller id. Signals are idempotent: a repeat is harmless, a miss is not.
- The assistant's token stream keeps its own table (it is high volume) but is served by the same reader loop, not by a database read per connection.

## Receiving (UI)

- Nobody in `src/features` opens an `EventSource` or sets `refetchInterval` / `setInterval` to fetch. `useLiveChanges()` is mounted once, in the studio layout, and is the only reader.
- To make a screen follow something, add an entry to the topic → query-key map in `src/features/app/lib/live-signals.ts`. `job` signals write progress straight into the cache; every other topic invalidates the keys it maps to.
- To show a job, use `useJob(id)`. It reads the cache the feed fills; do not write another `/jobs/:id` query.
- A screen needs nothing for the case where the feed is down: one slow refresh (30 s) of the active queries runs only then, and a reconnect refreshes them once.

## Do not

- Add a timer to a hook "just for this screen".
- Add a signal from a route handler or a service instead of the repository that writes the data.
- Put user or AI content in `data`.
- Open a second connection (a screen-level `EventSource`) for one feature.

## Checked by

- **Checked by: ESLint** (`no-restricted-syntax`): `refetchInterval` anywhere in `src/features` and `new EventSource` outside the live hook and `use-live-turn`. `src/features/app/lib/live-feed.ts` (the 30 s fallback) and `use-live-turn.ts` (the chat stream) are the only exceptions.
- **Checked by: a test**: every topic in the catalog has a UI map entry; `data` of each topic validates against its schema.
- **Checked by: a test**: a tab receives only its own workspace's signals.
- **Checked by: a test**: a progress write (and `touch`) leaves no `episode` row.
- **Soft**: the write and its signal in one transaction; one signal per change.
- The feed connection re-checks membership at each heartbeat and guards every write to a closed stream; both have tests in step 2.
