---
name: write-review
description: Write review.md for a feature dossier as an independent reviewer. Use after the build is finished.
---

# Write a review

You did not write this code. Start from the diff, not from the author's summary.

1. Read `spec.md` acceptance, `plan.md`, `docs/conventions/`. `git diff <base>` and `git status` for untracked files.
2. Per acceptance line: pass / fail / not checked, with evidence. No evidence means not checked.
3. Bugs first (wrong result, missing await, unscoped query, double-paid call, stale cache key, lost draft), then convention breaks, then simplifications.
4. `npm run check` and paste the result.
5. Copy `docs/features/_templates/review.md`, fill it, level findings `blocker` / `should` / `nit` with `file:line`.
6. Verdict `approved` only with no open blocker and every acceptance line passed.

Do not fix the code. A re-review covers the new diff.
