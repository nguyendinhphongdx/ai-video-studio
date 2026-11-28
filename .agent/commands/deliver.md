---
description: Verify and close a dossier (check, use the screen, mark delivered)
argument-hint: <dossier number, e.g. 0007>
---

Use the `verifier` agent (`.agent/agents/verifier.md`) for dossier $ARGUMENTS in `docs/features/`, following the `deliver-feature` skill.

Refuse to close when `review.md` is missing or not `approved`. Report what works, what was not verified, what costs money, and what is uncommitted. Do not commit, push or rebuild the public site.
