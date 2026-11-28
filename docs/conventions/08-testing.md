# 08 Testing

Vitest (`npm test`). `tests/core` (pure), `tests/server` (real services and repositories on an in-memory PGlite per file), `tests/tools`, `tests/ui`. `tests/setup.ts` opens the database for server tests and makes one test account and workspace that `ctx()` falls back to.

## What needs a test

| Change | Test |
| --- | --- |
| Pure function, rule, check, planner (`src/core`) | `tests/core/<name>.test.ts`, no database, no mocks if possible |
| Service, repository, job handler | `tests/server/<name>.test.ts` through the real service on PGlite |
| New table | a case in `tests/server/workspace-isolation.test.ts` |
| New block | `tests/tools/catalog.test.ts` still passes; add a test for `normalize`/`sfx` when non-trivial |
| New quality rule | `tests/core/script-checks.test.ts` |
| AI task | valid output, invalid output, the repair path, with the LLM adapter mocked |
| UI component with logic | `tests/ui/<name>.test.tsx` |
| Bug fix | a test that fails before the fix and passes after |

A change with new behaviour and no test is not finished. **Soft:** the reviewer checks it. CI only checks that a product change has a dossier or `[small]`.

## How

- Mock the LLM, image and voice adapters (`vi.mock('@/server/adapters/llm/llm.service', …)`). A test never calls a paid provider and never needs a key.
- Server tests set `AVS_DATA_DIR` in `vi.hoisted` before any server module loads, and import server modules lazily inside `beforeAll` (see `tests/server/series-service.test.ts`). Clean up the data dir in the returned teardown.
- Test behaviour through the public service function, not private helpers. Assert the result and what was stored, not call counts of internals.
- Names say the behaviour: `it('keeps finished scenes when the script is rewritten')`.
- No `sleep`, no real network, no wall-clock dependence; inject the time or use fake timers.
- A failing test is fixed or deleted with a reason in the PR, never skipped (`it.skip`) or loosened to pass.

## Proof beyond tests

Tests passing is not the same as the thing working (playbook step 5): a UI change is used at http://localhost:3300; a pipeline change runs one real job through the worker (stop the container worker first: it shares the database). Say in the review what you did and did not verify.

**Checked by:** `npm test` (CI). Coverage of new behaviour is **soft**.
