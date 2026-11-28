---
id: 0002
title: Project settings redesign
status: approved
owner: phongnd
size: large
touches: [ui, server, assistant, docs]
created: 2026-11-28
---

# Project settings redesign

## Problem
"Cài đặt dự án" has four thin tabs. General has five fields and no sense of what is missing. Voice is a plain list of radio buttons with no way to hear a voice before choosing it. Knowledge is one big text box. Budget only sets a limit: nobody can see what this project has spent, on what, or when. Brand parts (logo, colours, picture style, intro and outro art, default skill) still live on the old `/channels/:id` page, so settings are split across two places.

## Outcome
One settings screen with a vertical menu on the left (a select on phones) and one section on the right, each section saved on its own. Sections:
1. **"Chung"**: name, description, audience, tone, hashtags, plus a completeness line ("Thiếu mô tả") and a one-click "AI làm" for what is missing.
2. **"Thương hiệu"**: logo, colours, picture style, intro and outro art, with a live preview. Moved from the old page, same behaviour.
3. **"Giọng đọc"**: voices grouped (nữ, nam; miễn phí, Google), each with a "Nghe thử" button that plays a sample line (editable text, default taken from the project description). Unavailable voices say why ("Chưa có Google API key") and link to the setting. Closing line and subscribe text move here with a preview of the end card.
4. **"Tri thức"**: the existing editor, with version list on the side (view, compare with current, restore), a size meter, and "AI làm" to draft or extend it.
5. **"Chi phí"**: usage dashboard of this project for 7 days, 30 days, all: total, daily chart, split by kind (text, picture, voice, render) and by episode, recent events list; the monthly budget sits at the top with a progress bar and its mode.

## Scope
- In: the six sections, left menu, per-section save with "Chưa lưu" guard when leaving, voice sample, usage dashboard for one project (reuse `DailyChart`, `Breakdowns`, `EventsList`), moving brand editing in.
- Out (on purpose): archive or delete project, speaking speed, custom date range (7 days, 30 days, all only), new brand features, new voices, publishing to platforms, member permissions, changing how budgets are enforced.

## Acceptance
- [ ] Every section reachable from the menu and by URL hash; phone width uses a select, no horizontal scroll.
- [ ] Leaving a section with unsaved changes asks first.
- [ ] "Nghe thử" plays a sample for an available voice; for an unavailable one it explains why and does not call anything.
- [ ] "Chi phí" shows only this project's events and totals, matching the numbers on the product-level cost page for the same range.
- [ ] Budget progress bar shows spent, limit, state (ok, alert, over).
- [ ] Brand section edits what `/channels/:id` edited; the old page links here.
- [ ] Tests: usage summary filtered to one project (workspace scoped), section guards, voice grouping helper.

## Constraints
- Every query workspace-scoped; the project usage summary takes `channelId` and 404s if the project is not in the workspace.
- "Nghe thử" is a paid call for Google voices (a few characters, cents): show "ước tính" before the first play of a Google voice, Edge voices are free. Uses the existing `POST /tts/preview`.
- No new table or column.
- UI text Vietnamese; v2 CSS only (no Tailwind), `DataTable` for any table.

## Decisions
Owner: drop the danger section; no speaking speed. Date range left at 7 days, 30 days, all (default).
