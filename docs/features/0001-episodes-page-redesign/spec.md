---
id: 0001
title: Episodes page redesign (setup, new episode with AI, shared DataTable)
status: approved
owner: dinhphong
size: large
touches: [ui, assistant, core, server]
created: 2026-11-28
---

# Episodes page redesign

Screen: project home "Các tập" (`ProjectEpisodesView` in `src/features/v2/views/ProjectViews.tsx`, plus `SetupChecklist.tsx`).

## Problem
Three parts of this screen work against the person:
1. **Setup bar** shows 8 coloured pills (green/amber) that all look like links. It does not say what is done, and it offers one fixed action (draw pictures). The person cannot ask the AI to do a part.
2. **New episode** is a bare input and a "Tạo tập" button. Nothing helps the person decide what the next episode should be, and pressing the button creates the episode with no check that it fits the story.
3. **Episode table** is a fixed hand-written `<table>`: sorted only by update time (so episode 6 sits above 5, 4, 3), no search, filter, sort or paging, and little information per row. Every other table in the app is separately hand-written too.

## Outcome
- The setup block is a checklist: a green tick for each finished part, an empty circle for each missing one. Every open part has an "AI làm" button that opens the assistant with a ready, detailed request for that part only; the person confirms in the panel and the assistant does that part step by step. Paid steps (pictures) show their price first. When all parts are done the block collapses to a one-line "Đã thiết lập đủ".
- "Tập mới" is a panel with: a topic field, a "Gợi ý chủ đề" button, and "Phân tích" instead of an immediate create. AI suggestions are built from the project's premise and bible, its knowledge, the series roadmap and the state of every episode, so the next episode continues the film. Choosing a suggestion fills the field. "Phân tích" returns, for confirmation, a proposed title, a two-sentence synopsis, where it sits in the story (after which episode, what question it answers) and any problem found (duplicate of an existing episode, a gap in the order). "Tạo tập" then creates it as today.
- The episode list is a table with columns: number, title (with topic below), scenes, duration estimate, status and progress, cost so far, updated. Default order is by episode number. It has search (title/topic), filter (status, with counts), sort on every sortable column, paging, empty and loading states, and a row opens the episode at its current step.
- One reusable `DataTable` component backs this table and replaces the hand-written tables elsewhere over time. It supports: search, filters, sorting, paging, custom columns (header, cell, footer render), row click, selection, empty/loading/error states, and controlled mode so a table can later page on the server.
- The page layout is redesigned: header with project name, stats (episodes by status, total cost), and primary actions; setup and "Tập mới" in a clear hierarchy above the list.

## Scope
- In:
  - `DataTable` component in `src/components` with a documented API, used first by the episode list; migrate the skills table on the project style page as proof of reuse.
  - Setup checklist rewrite (tick/circle, per-item "AI làm" through the assistant, progress, collapse when complete).
  - "Gợi ý chủ đề" and "Phân tích": extend the `suggest-topics` task with the series roadmap, bible premise and episode statuses; a new `analyze-topic` task (title, synopsis, story position, problems), both with the in-app AI harness.
  - Assistant tools for the per-item setup requests where the assistant lacks one.
  - Page layout and header.
- Out (on purpose):
  - Server-side paging and search (the DataTable supports it; the episode list stays client-side while a project has tens of episodes).
  - Migrating every other table in the app (done one by one in later dossiers).
  - Changing how an episode is written after it is created.
  - Bulk actions on episodes (delete, produce): selection exists in the component but no bulk action ships.

## Acceptance
- [ ] Setup block shows a green tick per finished part and an empty circle per missing one, with `Xong n/8`; it collapses to one line when everything is done.
- [ ] Each missing part has an "AI làm" button that opens the assistant with a request specific to that part (what is missing, what to produce, what to ask the person first); it sends nothing and spends nothing until the person confirms in the panel. Picture parts show the estimated price.
- [ ] "Gợi ý chủ đề" returns 3 to 5 suggestions that name the episode they follow from and the question they answer; with no episodes it suggests a first episode from the premise.
- [ ] "Phân tích" shows title, synopsis, story position and problems before anything is created; "Tạo tập" creates the episode and opens its script step; the analysis can be edited or dismissed.
- [ ] Both AI calls go through `runTask`, record cost, show their price before running, and a failed AI call never blocks creating an episode by hand.
- [ ] Episode list default order is by episode number; search finds by title or topic; status filter shows counts; every sortable column sorts; paging works; keyboard-focusable rows open the episode.
- [ ] `DataTable` has tests for sort, filter, search, paging and custom render, and the skills table uses it with no visual regression.
- [ ] UI text is Vietnamese; screen used at http://localhost:3300 in empty, loading, error and populated states, at laptop and phone width.
- [ ] `npm run check` green; dossier check green.

## Constraints
- Rules 3 and 4 (AGENTS.md): both new AI calls are tasks run in the worker through the job queue (or the assistant loop), not hand-built prompts in the screen; no AI input of the screen's own beyond the two buttons that call assistant tools. "Phân tích" and "Gợi ý chủ đề" cost a model call each: show the estimate before running (as the storyboard buttons do).
- Rule 8: new screen code goes in the current screen set (`src/features/v2`), not the older folders; the shared component goes in `src/components`.
- Rule 7 cost ledger applies to the new tasks (Vietnamese labels in `features/usage/lib/format.ts`).
- New dependency needs the owner's yes (see open questions).

## Decisions (owner, 2026-11-28)
1. DataTable is built on TanStack Table (`@tanstack/react-table`, new dependency approved).
2. "Phân tích" is optional: a button next to "Tạo tập", which always works without the AI.
3. One dossier delivered in four plan steps (DataTable, list page, new episode with AI, setup checklist); default taken from the recommendation, the owner did not object.
