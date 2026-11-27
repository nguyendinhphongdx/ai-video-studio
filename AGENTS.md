# AGENTS.md: AI Video Studio

Single source of truth for coding agents and people working in this repo. `CLAUDE.md` only points here.

## What this is

A studio where an AI agent writes videos for a channel and a person approves them twice (script, then video).
Every **series** behaves like an agent: instructions (bible), memory (previous episodes), tools (render
blocks) and skills (playbooks). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything
in `src/core`, `src/tools` or `src/server`.

## Layout

```text
market/skills/<id>/SKILL.md    the market: skills to install into a channel (a channel's own copies live in SQLite)
remotion/                      React components for @remotion blocks (render + @remotion/player)
seed/channels/<slug>/          first-run channels
src/core/                      domain + extension points + workflows + the assistant loop (src/core/assistant). Never imports Next.js, the DB or Remotion.
src/tools/<tool>/              one folder per tool: tool.ts, blocks/*.ts, renderer.ts (server only)
src/server/                    db, http helpers, adapters (llm, image, tts, video, media), modules/<x>/<x>.{repository,service,types}.ts, assistant/tools (what the assistant can do)
src/worker/                    job queue + outbox delivery (separate process)
src/app/                       Next.js App Router (UI + thin route handlers)
tests/                         vitest: core contracts and tool catalog
```

## Hard rules

1. Dependencies point one way: `app -> server -> core`, `tools -> core`. `core` stays framework-free.
2. A new capability goes into one of the eight extension points (docs/ARCHITECTURE.md). If it fits none, stop and discuss; do not patch around the architecture.
3. Every AI call goes through `runTask` (`src/core/agent/runner.ts`), or through the assistant loop (`src/core/assistant/loop.ts`) for the one conversational AI. No hand-built prompts anywhere else, and no AI inputs scattered over screens: anything the AI can do for the person is an assistant tool.
4. Long work (AI, voice, render) runs in the worker through the job queue. Route handlers validate, call a service, return.
5. Series rules are versioned (`series_versions`); never mutate a version. Episodes pin the version they were written with.
6. The web process never imports `src/tools/renderers.ts` or `@remotion/renderer`.
7. Migrations in `src/server/db.ts` are append-only. Paid calls (LLM, picture, voice) must go through the adapters that record them in the cost ledger (see docs/ARCHITECTURE.md, Cost tracking).
8. UI text is Vietnamese; code, comments and commit messages are English.
9. **Request context, never parameters.** Who is acting and in which workspace lives in one AsyncLocalStorage, `ctx()` from `src/server/context.ts` (NestJS-style request scope). The auth guard `route()` verifies the session and sets it for every API request; the worker sets it for every job and outbox event (`authService.contextFor` + `runWithContext`). Services and repositories read `ctx().workspaceId`, `ctx().userId`, `ctx().user`, `ctx().role`, and tag paid calls with `withUsage({...})`. Never pass the user, the workspace, the role or the session through function parameters. Only `src/server/modules/auth`, the worker's queue (`jobQueue`) and outbox delivery may read across workspaces.
10. **Every data table has `workspace_id` and `user_id`; every query filters by `workspace_id`** (and every insert sets both from `ctx()`). A row of another workspace is "not found" (404), never 403. New tables follow the same rule; `tests/server/workspace-isolation.test.ts` covers it.

## Commands

```bash
npm run dev         # Next.js on :3300 + worker
npm run typecheck
npm test
npm run studio      # Remotion Studio for the blocks
```

Verify before reporting done: `npm run typecheck` and `npm test` green; for pipeline changes run a real job through the worker.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
