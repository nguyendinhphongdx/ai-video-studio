---
spec: NNNN
status: draft # draft -> approved -> done
---

# Plan: <feature name>

## Approach
One paragraph: which extension point(s) this uses and why (docs/conventions/05-extension-points.md). If it fits none, stop and ask the owner.

## Steps
Each step is small enough to review alone and leaves `npm run check` green.

1. [ ] <step> — files: `...` — proof: <test or screen>
2. [ ] ...

## Files touched
| Area | File | Change |
| --- | --- | --- |
| | | |

## Data
New tables or columns (with `workspace_id` and `user_id`), migration name, `USING` casts, isolation test. Write "none" if none.

## Paid calls and jobs
Which AI, picture or voice calls this adds, which worker job runs them, how queueing twice avoids paying twice, estimated cost per use. Write "none" if none.

## Risks
What could break, what depends on this, how it is undone.

## Proof
How the result is shown to work: tests added, screens used at http://localhost:3300, a real worker job for pipeline changes.
