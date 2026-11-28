# .agent: the shared harness

One place for everything an AI coding agent needs besides the code: subagents, skills, commands, templates. Every tool reads it from here, so Claude, Codex or any other agent follow the same playbook.

```text
AGENTS.md              entry point for every agent (hard rules). CLAUDE.md only points to it.
.agent/
  agents/<name>.md     subagent roles: one file each, frontmatter + the role's brief
  skills/<name>/SKILL.md   repeatable procedures (add a task, add a table, deliver a feature...)
  commands/<name>.md   slash commands: /spec /plan /build /review /deliver /check
docs/conventions/      the code conventions every change follows (read before writing code)
docs/features/NNNN-<slug>/   one dossier per delivered feature: spec.md, plan.md, review.md (+ retro.md)
scripts/harness/       what a machine runs: dossier check, stop-check hook
```

## How each tool loads it

| Tool | Reads | How |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` → `AGENTS.md`; `.claude/agents`, `.claude/skills`, `.claude/commands` | the three `.claude/*` folders are symlinks to `.agent/*` (committed) |
| Codex and others | `AGENTS.md` | it names this folder; read the role or skill file you need. Add a symlink from the tool's own folder to `.agent/<kind>` the day that tool is used. |

Never copy a file out of `.agent/` into a tool's folder: copies drift. Link or point.

## The delivery loop

```text
/spec  idea         spec-writer   → docs/features/NNNN-slug/spec.md      (owner approves the spec)
/plan  NNNN         planner       → plan.md                              (owner approves the plan on large work)
/build NNNN         implementer   → code + tests, one small step at a time
/review NNNN        reviewer + arch-guard, fresh eyes, never the author → review.md
/deliver NNNN       verifier      → npm run check, use the screen, close the dossier
```

Small fixes (a typo, one rule tweak) skip the dossier: put `[small]` in the PR title. Anything that adds a screen, a table, a job, an AI task, or changes behaviour people rely on gets a dossier.

The writer is never the reviewer. The reviewer gets the diff, the spec and the conventions, not the author's reasoning.

## Adding to the harness

- New role: `agents/<name>.md` with `name`, `description`, `tools`. Keep the tool list as small as the job allows.
- New skill: `skills/<name>/SKILL.md` with `name` and `description` (when to use it). Checklists, not essays. Point to `docs/conventions/` instead of repeating it.
- New command: `commands/<name>.md`, a prompt that starts an agent or skill with `$ARGUMENTS`.
- A rule that an owner corrects twice becomes (1) a line in `docs/conventions/`, (2) a check in `eslint.config.mjs`, a test, or `scripts/harness/` if a machine can check it. A rule with no check is labelled **soft** in the conventions.
