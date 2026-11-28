---
spec: 0002
status: approved
---

# Plan: Project settings redesign

## Approach
All UI in `src/features/v2/views/settings/` plus one server change: the usage summary takes an optional `channelId`. Old Tailwind components (brand preview, art panel, palette editor) are reused inside a `.legacy-ui` wrapper that restores their colour tokens (v2 reuses the name `--accent`).

## Steps
1. [x] **Usage per project** — `usageRepository.daily/by/byModel` take `channelId`; `usageService.summary(range, channelId?)` 404s for a project outside the workspace and filters budgets; route `?channelId=`; client. Proof: `tests/server/usage.test.ts`.
2. [x] **Helpers** — `lib/voices.ts` (group, split, readiness reason, sample line), `lib/line-diff.ts`. Proof: `tests/ui/settings-lib.test.ts`.
3. [x] **Shell** — menu (select on phones), URL hash, per-section save of its own fields, unsaved marks, confirm on leaving, `beforeunload`.
4. [x] **Sections** — General (completeness, "AI làm"), Brand (logo, avatar, palette, font, picture style, music, intro/outro art, live preview), Voice (grouped, "Nghe thử" with price for Google, end-card preview), Knowledge (versions, diff, restore as draft, size meter), Cost (budget bar, totals, daily chart, by task, by episode, searchable events on DataTable).
5. [x] **Old page links here** — note in `ChannelEditor`.

## Data
None. No new table or column.

## Paid calls and jobs
"Nghe thử" on a Google voice is one short TTS call tagged `tts_preview`, price shown on the button first. Edge voices are free. Nothing else new spends money.

## Risks
- Reusing Tailwind components in v2 can leak colours: wrapped in `.legacy-ui`.
- Per-section save sends the saved values of every other field, so a section never overwrites another section's saved data.

## Proof
Tests above, `npm run check`, and the screen at http://localhost:3300/projects/<id>/settings (phone width checked; desktop width could not be checked because the browser window would not resize).
