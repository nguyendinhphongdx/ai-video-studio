---
spec: 0004
status: approved # draft -> approved -> done
---

# Plan: Assistant chat on AI Elements with AG-UI streaming

## Approach
Keep the assistant loop, tools, permission rules and the worker job. Part A replaces the panel with AI Elements parts and adds attachments. Part B streams: the model adapters emit deltas, the worker writes them as events, a route serves them as AG-UI over SSE. The owner tries part A before part B starts.

Checked before planning (2026-11-28): shadcn/ui is MIT; AG-UI 1.0.5 is MIT and needs zod 4 (we have it); the AI Elements examples import types from `ai` and `@ai-sdk/react`, which we replace with our own types, so neither package is added; none of the examples read handles paste or drop, so we add both.

## Steps

### Part A: components and attachments
1. [x] Add the shadcn parts (`message`, `bubble`, `message-scroller`, `input-group`, `attachment`, `item`, `collapsible` (`code-block` and `trace` turned out not to be needed)) without overwriting existing `components/ui` files — files: `src/components/ui/*`, `package.json` (`@shadcn/react`) — proof: `npm run check`, other screens unchanged.
2. [x] Upload and keep attachments (PNG, JPG, WEBP, TXT, MD; pictures 8MB, text files 200KB; 5 per message; type checked from the bytes) — files: `assistant.service.ts`, route `assistant/threads/[id]/attachments`, `media.service.ts`, `media-access.ts` — proof: tests for refusal, workspace isolation, removal with the conversation.
3. [x] The model reads them: user chat messages carry attachments; Anthropic and OpenAI-style adapters send pictures as picture parts and text files as text; only the last 3 user messages re-send pictures (older ones are named in text) to limit cost; a model that refuses pictures gets a clear Vietnamese message — files: `core/ports.ts`, `core/assistant/loop.ts`, `adapters/llm/*` — proof: core and adapter-mapping tests.
4. [x] New panel: thread, messages, tool cards, approval card, copy, composer with attach, paste, drop, chips, send; everything on the spec's "kept" list — files: `features/assistant/*` — proof: screens at 1200px and 375px, an old conversation, approve and reject.

Stop here for the owner. Done 2026-11-28; still unproved: a real model turn with a picture, and clicking approve/reject on screen (rendering is covered by tests).

### Part B: AG-UI
5. [x] Trial: fixed AG-UI events drive the new components, including an interrupt — proof: screen; stop and ask if it does not fit.
6. [x] Streaming and thinking in the model port, usage recorded for finished, failed and stopped calls; falls back to a whole answer — proof: tests with fake streams.
7. [x] Event storage written by the worker (batched) and an SSE route that replays from a position — proof: isolation and replay tests.
8. [x] Screen consumes AG-UI: live text, thinking, tool states, interrupt, reconnect; polling kept as fallback — proof: reload mid-turn, through the tunnel.
9. [x] "Dừng": stop flag checked between deltas and before each tool — proof: loop test.

Built 2026-11-28. Choices made while building:
- Only `@ag-ui/core` (event types and schemas) is used. `@ag-ui/client` expects one request that runs the agent and streams back; here the worker runs it and the browser reads stored events with `EventSource`.
- Events are emptied when the conversation's next turn is queued, not when a turn ends, so a screen still reading does not lose the ending.
- Anthropic thinking blocks are not replayed to the model on later steps.
- "Dừng" cannot cut short a tool that is already running; it ends the turn after it.
- Unproved: thinking and streaming against a real provider (costs money; ask first), and the stream through the public tunnel with a real turn.

## Files touched
| Area | File | Change |
| --- | --- | --- |
| ui | `components/ui/*`, `features/assistant/*` | new parts, rebuilt panel |
| core | `core/ports.ts`, `core/assistant/loop.ts` | attachments; later deltas and stop |
| server | assistant module and routes, llm and media adapters | upload, picture parts; later events |
| db | `schema.ts` | part B only |

## Data
Part A: none. Attachment paths live in the existing `data` of the user message; files under `data/media/assistant/<workspaceId>/<threadId>/`.
Part B: one table of stream events per conversation (with `workspace_id` and `user_id`), cleared when the turn ends; migration and isolation test.

## Paid calls and jobs
No new job or kind of call. Pictures add input tokens on each turn that re-sends them; thinking (part B) adds output tokens. Recorded by the existing LLM adapter.

## Risks
- The new parts bring their own styles: check no other screen changes.
- Local dev and the public site share one database and one job queue: starting a dev worker interrupts running jobs. Do not start it while a job is running.
- Undo: part A is reverted by restoring the old panel; stored messages stay compatible.

## Proof
`npm run check`; the screens above at http://localhost:3300; one real model turn with a picture, only after the owner agrees to the cost.
