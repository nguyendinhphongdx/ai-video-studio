---
spec: 0003
status: approved # draft -> approved -> done
---

# Plan: unified characters, step 1

The owner asked the main agent to plan and build directly (2026-11-28). Steps 2 (equal abilities) and 3 (several
main characters, hero migrated) get their own plan.

## Approach
No data migration: pictures stay where they are (`characterSprites` for the old hero, `characterCast` for the rest).
One optional field, `bible.roster`, holds what was missing (name, description, "Chính", character or prop, owner).
A pure core module turns the bible into one list of characters and edits it; screen and Assistant use the same functions.
Extension points: assistant tool, worker job, v2 screen.

## Steps
1. [x] Core model — files: `src/core/character/roster.ts`, `domain/series.ts`, `series.types.ts` — proof: `tests/core/roster.test.ts`
2. [x] Drawing job that saves itself — files: `series/character.service.ts`, worker, route — proof: `tests/server/character.test.ts`
3. [x] Assistant tools — files: `assistant/tools/characters.ts` — proof: same server test
4. [x] Library screen per character — files: `v2/views/CastEditor.tsx`, `v2.css` — proof: browser, desktop and 390px
5. [x] Director offers shared props and the accessories of who is in the scene — proof: browser

## Data
No new table or column. `bible.roster` is optional JSON inside a series version.

## Paid calls and jobs
Job `draw_character` (one picture call per missing picture, budget and ledger through the image adapter, attributed to
channel and series). A second request for a character already being drawn is refused. Whatever was drawn before a
failure is saved.

## Risks
The public site shares the database: until rebuilt, its worker cannot run `draw_character`, and saving a series there
drops `roster`. Undo: revert; old pictures are untouched.

## Not in step 1
Own actions and walk/sit/bow for characters other than the old hero (step 2); the old hero cannot be removed (step 3).
