# Code conventions

The shape every change follows, so the codebase stays one shape as it grows. [AGENTS.md](../../AGENTS.md) holds the hard rules (numbered); these files say how to follow them with real examples from this repo. If this folder and the code disagree, the code is wrong or this folder is stale: say which, and fix one.

Read the files for the layer you touch before writing code. Copy the neighbour that already does the same kind of thing.

| # | File | Read when you touch |
| --- | --- | --- |
| 01 | [Layers and dependencies](01-layers-and-dependencies.md) | any import across folders |
| 02 | [Server modules](02-server-modules.md) | `src/server/modules`, services, repositories |
| 03 | [API routes](03-api-routes.md) | `src/app/api` |
| 04 | [Database](04-database.md) | `src/server/schema.ts`, migrations |
| 05 | [Extension points](05-extension-points.md) | new tasks, blocks, steps, jobs, checks, assistant tools |
| 06 | [Frontend](06-frontend.md) | `src/features`, `src/app` pages, `src/components` |
| 07 | [AI calls and cost](07-ai-calls.md) | anything that calls a model, picture or voice provider |
| 08 | [Testing](08-testing.md) | any change (every change needs a test) |
| 09 | [Naming and style](09-naming-and-style.md) | any new file, function, comment |
| 10 | [Live updates](10-live-updates.md) | anything that must show up on screen without a reload: sending a change, following one in a screen |

## How a rule is enforced

Each rule file ends its sections with one of:

- **Checked by: `<tool>`** a machine fails the change (ESLint, `tsc`, a test, `scripts/harness/`, CI). Hard.
- **Soft** nothing fails it yet; a reviewer enforces it. When the owner corrects a soft rule twice, add a check and change the label.

Where a hard check is still planned, the file says **Planned**; it is soft until it exists.

## Changing a convention

Do not edit a convention inside a feature change. Open a spec (`/spec`), say what mistake the rule prevents, add the check in the same change as the text, and update the matching skill in `.agent/skills`.
