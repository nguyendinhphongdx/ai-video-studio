---
description: Implement the next unchecked step of an approved plan
argument-hint: <dossier number, e.g. 0007>
---

Use the `implementer` agent (`.agent/agents/implementer.md`) for dossier $ARGUMENTS in `docs/features/`.

Do the next unchecked step of `plan.md` only, with its test, then run `npm run check`. Tick the step. Report what works, what you did not verify, what costs money. Stop after one step unless the owner said to continue. Set the spec to `building` on the first step.
