---
name: add-ai-task
description: Add a new AI capability (a model call) to the studio. Use whenever something needs the model to read context and return structured output.
---

# Add an AI task

Rules: `docs/conventions/07-ai-calls.md`. Copy `src/core/tasks/summarize-episode.ts` for a simple one, `plan-story.ts` for one with context.

- [ ] `src/core/tasks/<name>.ts` with `defineTask({ id, version, layers, schema, prompt, parse })`. Keep `core` free of framework imports. Bump `version` when prompt or schema changes.
- [ ] Ask only for the context layers the task needs.
- [ ] Callers use `runTask`, nothing else builds a prompt. Called from a worker job, never from a route.
- [ ] Vietnamese label in `src/features/usage/lib/format.ts` (cost screen).
- [ ] Harness: rules in the prompt, a machine check (`...Problems()` or a quality check), a second AI pass when it needs reading, one automatic repair kept only if not worse, leftovers shown to the person (AGENT-PLAYBOOK, "In-app AI harness"). Add the row to that table.
- [ ] Test with the LLM adapter mocked: valid output, invalid output, the repair path.
- [ ] If the assistant should offer it, add an assistant tool (`src/server/assistant/tools`) and list it in `index.ts`; no AI inputs scattered over screens.
- [ ] `npm run check`.
