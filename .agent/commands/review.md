---
description: Independent review of a dossier's diff (writes review.md)
argument-hint: <dossier number, e.g. 0007>
---

Use the `reviewer` agent (`.agent/agents/reviewer.md`) for dossier $ARGUMENTS in `docs/features/`, and the `arch-guard` agent on the same diff.

The reviewer must not be the agent that wrote the code: start it fresh, with the diff, the spec and the conventions only. Write `review.md` from the template. Report the verdict and every `blocker`.
