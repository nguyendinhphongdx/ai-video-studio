# Feature dossiers

One folder per delivered feature, so the next person (or agent) can see what was asked, how it was planned and what was checked.

```text
docs/features/
  _templates/          spec.md, plan.md, review.md, retro.md: copy, do not edit in place
  0001-<slug>/
    spec.md            problem, outcome, scope, acceptance      (owner approves)
    plan.md            approach, steps, files, data, paid calls (owner approves on large work)
    review.md          fresh-eyes review, evidence, verdict     (written by someone who did not write the code)
    retro.md           optional: mistakes turned into rules
```

## Rules

- Numbers are four digits, next free number, never reused. `slug` is lowercase words joined by `-`.
- A dossier moves `draft → approved → building → delivered`. `scripts/harness/check-dossiers.mjs` (run by CI and `/check`) fails when:
  - a `spec.md` lacks the frontmatter keys of the template,
  - status is `building` or later with no `plan.md`,
  - status is `delivered` with no `review.md`, or its verdict is not `approved`.
- Small changes have no dossier. Put `[small]` in the PR title; CI then lets the change through without one.
- Do not rewrite history: a delivered dossier is corrected with a short dated note at the bottom, not edited to look right in hindsight.
- Architecture decisions that outlive one feature go to `docs/decisions/NNNN-<slug>.md` (context, decision, consequences) and are linked from the spec.

## Index

| # | Feature | Status |
| --- | --- | --- |
| | | |
