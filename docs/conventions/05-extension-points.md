# 05 Extension points

A new capability goes into one of these (rule 2). If it fits none, **stop and ask the owner**; do not patch around the architecture. Registries are validated at start-up (`src/core/registry.ts`): duplicate ids, tools without renderers and step cycles fail at boot.

| Need | Add | Contract | Copy this |
| --- | --- | --- | --- |
| New scene type | `src/tools/<tool>/blocks/<block>.ts` (+ component in `remotion/blocks`) | `src/core/tools/tool.ts` `defineBlock` | `blocks/counter.ts` |
| New kind of context | `src/core/context/providers/<x>.ts`, list in `providers/index.ts` | `core/context/layer.ts` | a neighbouring provider |
| New AI job | `src/core/tasks/<x>.ts` | `core/agent/task.ts` `defineTask` | `tasks/summarize-episode.ts` |
| New production step | `src/core/pipeline/steps/<x>.ts`, list in `steps/index.ts` | `core/pipeline/step.ts` | `steps/thumbnail.ts` |
| React to something | a subscriber in `src/server/subscribers.ts` | `core/events/events.ts` | existing subscribers |
| New quality rule | `src/core/quality/checks/index.ts` | `core/quality/check.ts` | existing checks |
| Something the AI can do for the person | `src/server/assistant/tools/<group>/<name>.tool.ts`, list in the group's `index.ts` | `core/assistant/tool.ts` | `tools/series/get-series.tool.ts` |
| New provider (LLM, picture, voice, storage, upload) | port in `core/ports.ts` + adapter in `src/server/adapters/<x>` | `core/ports.ts` | `adapters/image` |

Long work additionally needs a **worker job** (`JobKind` in `src/core/domain/job.ts`, handler in `src/worker/index.ts`). See `.agent/skills/add-job`.

## Rules per point

**Blocks.** The props zod schema, the `fields` the editor shows, and the React component props must agree: keep the compile-time `Assert<Same<z.infer<typeof props>, XSceneProps>>` line. `aiGuide` states when to use the block, when not, and a cap per video. Everything in `remotion/` is a pure function of the frame number (seeded noise, no `Math.random`, no `Date.now`) so renders repeat. Changing how a render looks bumps `RENDER_VERSION` in `src/core/pipeline/steps/render.ts`. A block that needs no picture must not declare an `image` slot.

**Tasks.** `id` is kebab-case and unique; bump `version` when prompt or schema changes (stored with every run). Ask only for the context layers the task needs. The prompt is a pure function of its input. The result passes `parse`, and a failed parse is an error, not a silently patched value. See 07.

**Steps.** Declare `after`, `weight`, `inputs(ctx)` (everything that changes the output), and `reusable` when files can vanish. Outputs are cached in `step_runs` by `hashOf(inputs)`; a step that reads something not in `inputs` returns stale results.

**Quality checks.** They warn; they never change content. Each check has an id, a level (`error` blocks approval, `warning` shows), a clear Vietnamese message, and a test in `tests/core/script-checks.test.ts`.

**Jobs.** The handler runs inside `ctx()` set by the worker. Queueing twice must not pay twice. A job returns data only if it must (`generate_sprites`); otherwise it changes the episode and the UI re-reads it.

**Assistant tools.** One class per file, `src/server/assistant/tools/<group>/<name>.tool.ts`, extending `StudioTool` (`core/assistant/tool.ts`) and listed in the group's `index.ts`; `tools/registry.ts` is the one list for the Assistant and MCP. A tool gives name, title, description, risk, input and output schemas, `summarize`, `execute` (the only logic) and `present` (what the model reads); `run` is shared and not overridden. Declare a risk (`read`, `write`, `paid`, `destructive`) honestly: it decides whether the person is asked. A tool only enqueues long work; one that must call a model while it runs sets `surfaces = ['assistant']`. A tool refuses ids of another channel. The quality guidance for what it saves is attached to the tool (`src/core/assistant/guides.ts`). Anything the AI can do for the person is a tool; screens have no AI inputs of their own (rule 3). What the model is told is snapshotted in `tests/server/assistant-tools.contract.json`.

**Adapters.** A port in `core/ports.ts` describes what core needs, nothing provider-shaped. The adapter writes the cost ledger for every paid call (see 07). Providers are configured through `src/server/config.ts` and settings, not read from `process.env` in scattered places.

**Checked by:** start-up validation (`core/registry.ts`, `validateTools`), `tests/tools/catalog.test.ts`, the `Assert<Same<…>>` types, `tests/core/*`. The rest is **soft**.
