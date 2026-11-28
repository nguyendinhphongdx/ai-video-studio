---
name: deliver-feature
description: Run the whole delivery loop for a feature: spec, plan, build, review, deliver, with a dossier in docs/features. Use for any work that adds a screen, table, job or AI task, or changes behaviour people rely on.
---

# Deliver a feature

Gates are the owner's. Stop at each one and ask; do not approve your own spec or plan.

1. **Spec** — `spec-writer` makes `docs/features/NNNN-slug/spec.md` (`draft`). Owner answers open questions and approves → `status: approved`.
2. **Plan** — `planner` makes `plan.md`. Owner approves on large work (new table, paid call, new job, new screen) → `status: approved`.
3. **Build** — `implementer`, one plan step at a time, each ending with `npm run check` green. First step sets spec `building`.
4. **Review** — a different agent: `reviewer` (+ `arch-guard`) writes `review.md`. `blocker` findings go back to step 3, then a new review of the new diff.
5. **Deliver** — `verifier`: `npm run check`, use the screen, real worker job if the pipeline changed, `node scripts/harness/check-dossiers.mjs`; spec `delivered`; row added to `docs/features/README.md`.
6. **Retro** — only if the owner corrected the same kind of mistake twice: `retro.md`, and a new line in `docs/conventions/` plus a check.

Small fix (typo, one-rule tweak, copy change)? No dossier: do the change, `npm run check`, and put `[small]` in the PR title.

Never commit, push, delete data or rebuild the public site without the owner's yes.
