# 07 AI calls and cost

## One path in (rule 3)

- Every model call goes through `runTask` (`src/core/agent/runner.ts`) or, for the one conversational AI, the assistant loop (`src/core/assistant/loop.ts`). No hand-built prompts anywhere else, no `new OpenAI()` or `new Anthropic()` outside `src/server/adapters`.
- `runTask` compiles the layers a task asks for (system rules, channel, bible, skill, style + blocks, format, memory, episode, knowledge), calls the model, validates against the task schema, and stores an `ai_runs` row with the exact context, so a result can be explained and reproduced.
- Anything the AI can do *for the person* is an assistant tool (`src/server/assistant/tools`), not an input on a screen.
- AI calls happen in the worker (rule 4). A route enqueues, a job runs `runTask`.

## Prompts

- The prompt says the rule; schema `describe()` strings tell the model the limits (lengths, no invented facts). Rules every channel needs live in `core/tasks/story.ts`; a rule for one style lives in a skill.
- A prompt is a pure function of its input and context layers. No `Date.now()`, no random, no reading files.
- Bump the task `version` when prompt or schema changes.
- Prompts and AI-facing text may be Vietnamese where the output is Vietnamese; code and identifiers stay English.

## The in-app AI harness

What the AI hands the person should already have passed review (AGENT-PLAYBOOK "In-app AI harness"):

1. Rule in the prompt.
2. A deterministic machine check (`core/quality/checks`, or a `...Problems()` next to the task).
3. A second AI pass for what needs reading (`review-script`).
4. One automatic repair from those findings, kept only if it is not worse. A failed review never loses the draft.
5. What is left is shown to the person next to the thing it concerns. Never silently change approved content.

A new AI-written resource adds its row to the table in AGENT-PLAYBOOK. When the owner corrects the same kind of mistake twice, it becomes a rule and a check there, not a fix of that one video.

## Cost (rule 7)

- Every paid call (LLM, picture, voice) is a row in `usage_events`, written by the adapter (`llm.service`, `image.service`, `tts.service`), never by the core.
- Calling a provider outside those adapters is a bug: it spends money the ledger and the budgets cannot see.
- Tag who the call belongs to with `withUsage({...})` (the worker and the assistant turn already open the scope); the core only passes `purpose` (task id) and `sceneId` through the ports.
- `usageService.assertWithinBudget()` runs before each paid call; a "block" budget stops it.
- Queueing the same paid work twice must not pay twice: compare the hash of the prompt/text the file was made for, skip finished work.
- Paid work happens only on request, or automatically only where the video's own setting says so (`autoImages`, `autoVoice`). Show the count and estimated price before a batch (`make-plan`, `POST /usage/estimate`).
- A new task gets a Vietnamese label in `src/features/usage/lib/format.ts`.
- Tests mock the LLM, image and voice adapters. A test never spends money.

**Checked by:** `tests/server/usage.test.ts`, `tests/core/usage-cost.test.ts`, `tests/core/context-agent.test.ts`; `npm run lint` (an AI SDK import outside `src/server/adapters` fails). The harness steps and "queue twice" are **soft**; `arch-guard` checks them.
