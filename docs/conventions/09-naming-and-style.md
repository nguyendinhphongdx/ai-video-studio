# 09 Naming and style

Prettier-level style is not argued here. What matters is that a file looks like its neighbours.

## Language

- UI text, error messages the person sees, AI prompts that produce Vietnamese output: **Vietnamese** (rule 8).
- Code, identifiers, comments, commit messages, docs in `docs/conventions` and `.agent`: **English**.

## Files and names

| Thing | Convention | Example |
| --- | --- | --- |
| Server module files | `<module>.{types,repository,service}.ts` | `series.service.ts` |
| React component file | `PascalCase.tsx`, named export | `ScenesStep.tsx` |
| Hook file / hook | `use-kebab.ts` / `useThing` | `use-series.ts` |
| API client | `<feature>.api.ts`, exported `<feature>Api` | `seriesApi` |
| Service / repository objects | `<thing>Service`, `<thing>Repository` | `seriesRepository` |
| Task, block, step ids | kebab-case, unique | `summarize-episode` |
| Domain types | `PascalCase` in `src/core/domain`, one concept per file | `Episode` |
| zod schemas | `PascalCaseSchema` or `PascalCaseInput` with a same-named inferred type | `SeriesRulesInput` |
| Constants | `UPPER_SNAKE` | `RENDER_VERSION` |
| Booleans | `is/has/can…` | `isBusy` |
| Test files | `<subject>.test.ts(x)` under `tests/<area>/` | `script-checks.test.ts` |

Import with the `@/` alias (`@/core/…`, `@video/…` for `remotion/`); relative imports only inside the same folder. Groups separated by a blank line: external packages, `@/` and `@video/`, then relative.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters` are on; code compiles clean.
- No `any`, no `@ts-ignore`. If a type cannot be expressed, use `unknown` and narrow. A `@ts-expect-error` needs a reason on the same line. **Planned:** lint (`no-explicit-any`, `ban-ts-comment`).
- Prefer `type` imports (`import type { X }`) for types; this keeps `core` and the browser bundles clean.
- Derive types from zod (`z.infer`) instead of writing them twice.
- Return types on exported functions; let inference work inside.
- No default exports except where Next.js requires them (pages, layouts, `route` handlers use named exports).
- No `process.env` outside `src/server/config.ts`, the adapters that own a secret, and the worker. **Planned** lint.

## Comments

Comment the **why** (a constraint, a trap, a rule from AGENTS.md), never the what. A short doc comment on an exported function says what it is for. No commented-out code, no TODO without an owner and a dossier. The existing code is the model: short, factual, English.

## Size and shape

- Functions do one thing; over about 60 lines, split. Files over about 400 lines, split by use case (not by "utils").
- No "utils/helpers/common" dumping files. Put a helper next to its only user; move it to `src/lib` or `src/core` only when a second user appears and it has no framework dependency.
- No dead code, no unused option, no flag that is always the same, no abstraction for a single call. Delete, do not deprecate: git has the history.
- Do not add a dependency without the owner's yes. Explain what it replaces.
- Logging goes through `createLogger` (`src/server/logger`), never `console.log` in committed code.

## Commits

Conventional style as in the history: `feat(scope): …`, `fix(scope): …`, `docs: …`, `chore: …`, English, imperative, one concern per commit. Small changes put `[small]` in the PR title (no dossier needed). Do not commit `.env`, `data/`, logs or `tmp-*` folders.

**Checked by:** `tsc` (strictness, unused). Naming, comments and size are **soft**; **Planned** lint for `any`, `@ts-ignore`, `console`, `process.env`.
