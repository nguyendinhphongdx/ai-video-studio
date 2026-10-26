# Architecture

## Model

| Concept | What it is | Lives in |
| --- | --- | --- |
| Channel | Brand kit: audience, tone, voice, palette, logo, music, outro | SQLite `channels` |
| Tool | A rendering engine a skill can name: `@remotion`, `@hyperframes` | `src/tools/<tool>/tool.ts` |
| Block | A scene type of a tool with a props schema: `@remotion/cards` | `src/tools/<tool>/blocks/*.ts` |
| Skill | Playbook for one kind of video; references tools/blocks | `content/skills/<id>/SKILL.md` |
| Series | The agent for a show: bible + format + publish template, versioned | SQLite `series`, `series_versions` |
| Episode | One video, in a series (numbered) or one-off | SQLite `episodes`, `scenes` |
| Memory | What each approved episode covered, read by later episodes | SQLite `episode_memory`, `series_memory` |

A one-off video uses a format derived from its skill (one AI slot), so every video goes through the same path.

## The series agent

Every AI call compiles the same layered context (`src/core/context`), in this order, each with a size budget:

1. system rules · 2. channel · 3. series instructions (bible) · 4. skill · 5. style + allowed blocks ·
6. episode format (slots) · 7. memory (season summary + recent episodes) · 8. current episode

`runTask` (`src/core/agent/runner.ts`) compiles the layers a task asks for, calls the model, validates the
output against the task's schema and stores an `ai_runs` row with the exact context, so results can be explained
and reproduced.

The output schema of a script is generated from the episode's active **ai** slots and their allowed blocks.
**Locked** slots never reach the AI: they are filled from the format's templates (`{n}`, `{topic}`, `{next_topic}`...).

## Extension points

| Need | Extension point | Add | Contract |
| --- | --- | --- | --- |
| New scene type / engine | Tool → Block | `src/tools/<tool>/blocks/<block>.ts` (+ component, renderer) | `core/tools/tool.ts` |
| New kind of context | Context provider | `src/core/context/providers/<x>.ts`, list in `providers/index.ts` | `core/context/layer.ts` |
| New AI job | Agent task | `src/core/tasks/<x>.ts` | `core/agent/task.ts` |
| New production step | Pipeline step | `src/core/pipeline/steps/<x>.ts`, list in `steps/index.ts` | `core/pipeline/step.ts` |
| React to something | Domain event subscriber | `src/server/subscribers.ts` | `core/events/events.ts` |
| New quality rule | Quality check | `src/core/quality/checks/` | `core/quality/check.ts` |
| New provider (AI, TTS, storage, upload) | Port + adapter | `src/server/adapters/<x>` | `core/ports.ts` |

Registries are validated at startup (`core/registry.ts`): duplicate ids, tools without renderers and step cycles fail at boot.

## Runtime

- **Web** (Next.js): UI + route handlers. Services enqueue jobs and append events; they never render.
- **Worker**: claims jobs from `jobs` one at a time (`write_script`, `revise_script`, `produce`, `summarize`) and delivers `outbox` events to subscribers. Jobs left running by a crashed worker are failed on start, with a retry button in the UI.
- **Production** is a step graph (voice → render → assemble → quality). Step outputs are cached in `step_runs` by input hash, so a retry resumes from the failed step.
- **Storage**: SQLite (`node:sqlite`, WAL) in `data/app.db`; generated media in `data/media`; settings (API keys) in `data/settings.json`. All gitignored.
