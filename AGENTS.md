# AGENTS.md: AI Video Studio

Single source of truth for coding agents and people working in this repo. `CLAUDE.md` only points here.

## What this is

A studio where an AI agent writes videos for a channel and a person approves them twice (script, then video).
Every **series** behaves like an agent: instructions (bible), memory (previous episodes), tools (render
blocks) and skills (playbooks). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything
in `src/core`, `src/tools` or `src/server`.

## Layout

```text
content/skills/<id>/SKILL.md   playbooks (git-managed, editable in the app)
remotion/                      React components for @remotion blocks (render + @remotion/player)
seed/channels/<slug>/          first-run channels
src/core/                      domain + extension points + workflows. Never imports Next.js, the DB or Remotion.
src/tools/<tool>/              one folder per tool: tool.ts, blocks/*.ts, renderer.ts (server only)
src/server/                    db, http helpers, adapters (llm, tts, video, media), modules/<x>/<x>.{repository,service,types}.ts
src/worker/                    job queue + outbox delivery (separate process)
src/app/                       Next.js App Router (UI + thin route handlers)
tests/                         vitest: core contracts and tool catalog
```

## Hard rules

1. Dependencies point one way: `app -> server -> core`, `tools -> core`. `core` stays framework-free.
2. A new capability goes into one of the seven extension points (docs/ARCHITECTURE.md). If it fits none, stop and discuss; do not patch around the architecture.
3. Every AI call goes through `runTask` (`src/core/agent/runner.ts`). No hand-built prompts anywhere else.
4. Long work (AI, voice, render) runs in the worker through the job queue. Route handlers validate, call a service, return.
5. Series rules are versioned (`series_versions`); never mutate a version. Episodes pin the version they were written with.
6. The web process never imports `src/tools/renderers.ts` or `@remotion/renderer`.
7. Migrations in `src/server/db.ts` are append-only.
8. UI text is Vietnamese; code, comments and commit messages are English.

## Commands

```bash
npm run dev         # Next.js on :3300 + worker
npm run typecheck
npm test
npm run studio      # Remotion Studio for the blocks
```

Verify before reporting done: `npm run typecheck` and `npm test` green; for pipeline changes run a real job through the worker.
