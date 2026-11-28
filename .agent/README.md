# .agent: the shared harness

One place for everything an AI coding agent needs besides the code. Every tool reads it from here, so Claude, Codex or any other agent follow the same playbook. This file is an index: each fact lives in one file, the rest point to it.

| Thing | Lives in | Defined once in |
| --- | --- | --- |
| Roles (who does what, with which tools) | `agents/<name>.md` | the file itself: its `description` is the list, `ls .agent/agents` |
| Delivery loop (spec → plan → build → review → deliver, gates, `[small]`) | `skills/deliver-feature/SKILL.md` | that skill, nowhere else |
| Recipes (add a task, table, route, block, job, screen) | `skills/add-*/SKILL.md` | the skill |
| Slash commands | `commands/<name>.md` | one-line entry points that name an agent; they hold no instructions |
| Code conventions | `docs/conventions/` | the numbered files |
| Dossier templates and rules | `docs/features/` | `_templates/` and its README |
| What a machine runs | `scripts/harness/`, `eslint.config.mjs`, `.github/workflows/ci.yml` | those files |

`AGENTS.md` is the entry point for every agent (hard rules) and points here; `CLAUDE.md` points to `AGENTS.md`.

## How each tool loads it

| Tool | Reads | How |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` → `AGENTS.md`; `.claude/agents`, `.claude/skills`, `.claude/commands` | the three `.claude/*` folders are committed symlinks to `.agent/*` |
| Codex and others | `AGENTS.md` | it points here; read the role or skill file you need. Add a symlink from the tool's own folder to `.agent/<kind>` the day that tool is used. |

Never copy a file out of `.agent/` into a tool's folder: copies drift. Link or point.

## Adding to the harness

- **Do not restate.** Before adding text, check the table above: if the fact has a home, link to it. A role's behaviour goes in its agent file; a step of the loop goes in `deliver-feature`; a rule goes in `docs/conventions`.
- New role: `agents/<name>.md` with `name`, `description`, `tools` (as few as the job allows). If a skill or command would only repeat it, delete the repeat.
- New skill: `skills/<name>/SKILL.md` with `name` and `description` (when to use it). Checklists that point to `docs/conventions/`, not essays.
- New command: `commands/<name>.md`, a prompt that starts one agent or skill with `$ARGUMENTS`.
- A rule the owner corrects twice becomes a line in `docs/conventions/` and a check (`eslint.config.mjs`, a test, or `scripts/harness/`). A rule with no check is labelled **soft**.
