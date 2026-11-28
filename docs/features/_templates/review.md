---
spec: NNNN
reviewer: <agent or person, never the author>
verdict: pending # pending | changes-needed | approved
---

# Review: <feature name>

Reviewed against: `spec.md` acceptance, `plan.md`, `docs/conventions/`, and the diff only.

## Acceptance
| Criterion (from spec) | Result | Evidence |
| --- | --- | --- |
| | pass / fail / not checked | test name, screen, command output |

## Findings
Most severe first. `blocker` must be fixed; `should` is fixed or explained; `nit` is optional.

| # | Level | Where | Finding | Resolution |
| --- | --- | --- | --- | --- |
| 1 | | `file:line` | | fixed in <commit> / explained / open |

## Convention check
- [ ] Layers and imports (01)
- [ ] `ctx()` and workspace scoping (02, 04)
- [ ] Thin routes, zod input (03)
- [ ] Every AI call through `runTask` or the assistant loop; paid calls recorded (07)
- [ ] Tests for new behaviour (08)
- [ ] Vietnamese UI text, English code (09)

## Verification
- `npm run check`: <result>
- Screen used: <path and what was done> / not applicable
- Worker job run for real: <job id> / not applicable

## Not verified
What was not tested and why. Money spent while testing.

## Decision
<approved / changes-needed and what>
