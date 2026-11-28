# Agent playbook

How to change this repo so the owner has little to review and fix. The hard rules are in [AGENTS.md](../AGENTS.md).

## Every change

1. Read the code you will touch and one neighbour that already does the same kind of thing. Copy its shape.
2. Make the smallest change that fully works: no half features, no unused options.
3. Add a test for the behaviour (tests run on in-memory PGlite; mock the LLM, image and voice adapters).
4. `npm run check`.
5. UI change: open it at http://localhost:3300 and use it. Test passing is not the same as the screen working.
6. Report what works, what you did not verify, and what costs money or is still uncommitted.

## Recipes

| Change | Where | Also |
| --- | --- | --- |
| New AI capability | `src/core/tasks/<name>.ts` with `defineTask` | add its Vietnamese label in `features/usage/lib/format.ts`; harness below |
| New script or video rule | `src/core/quality/checks/index.ts` | test in `tests/core/script-checks.test.ts` |
| New scene block | `src/tools/<tool>/blocks`, component in `remotion/blocks` | `aiGuide` says when to use it and when not; bump `RENDER_VERSION` if renders change |
| New job | `JobKind`, `src/worker/index.ts` handler, label in `EpisodeShell` | queueing twice must not pay twice |
| New API route | zod input in `<module>.types.ts`, thin `route()` handler | |
| New table or column | `src/server/schema.ts`, `npm run db:generate` | workspace scoping and its isolation test |

## Ask the owner first

- Rebuilding the public site (`npm run stack`), pushing, deleting data.
- Anything that spends money beyond what was asked: show the count and the estimated price.

## Traps

- The `npm run dev` worker and the container worker share one database: stop the container worker while testing new worker code, then start it again.
- `tsx watch` restarts the worker on every save and interrupts running jobs.
- The public site runs the built image: code changes do not reach it until a rebuild.

## In-app AI harness

The in-app AI should hand the person something that already passed review.

1. Say the rule in the prompt (`core/tasks/story.ts` for rules every channel needs; a skill for one style).
2. Check what a machine can check, deterministically (`core/quality/checks`, or a `...Problems()` function next to the task).
3. Judge what needs reading with a second AI pass (`core/tasks/review-script.ts`).
4. Repair once, automatically, from those findings. Keep the repair only if it is not worse. A failed review never loses the draft.
5. Show what is left to the person next to the thing it is about; never silently change approved content.

| Resource | Rules in prompt | Machine check | AI review | Auto repair |
| --- | --- | --- | --- | --- |
| Episode script | story briefs, skill, bible | quality checks | `review-script` | one revision |
| Project setup proposal | `setup-project` | `setupProblems` | no | one retry |
| Pictures, sprites | image style, references | none | none | none: the person reviews them |

When the owner corrects the same kind of mistake twice, turn it into a rule and a check here instead of fixing that one video.
