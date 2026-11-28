---
spec: 0001
status: approved
---

# Plan: Episodes page redesign

## Approach
UI work in the current screen set (`src/features/v2`) plus one shared component. AI parts use existing extension points: the `suggest-topics` task is extended (task id stays, `version` bumps), and a new `analyze-topic` task (`src/core/tasks/analyze-topic.ts`) plus two assistant-free service calls shaped like the existing `episodeService.topicIdeas` (one short model call, nothing created, price shown first). "AI làm" on the setup checklist uses the one assistant (`useAssistantStore.ask`, `AskAiButton`): no new AI input on the screen (rule 3).

## Steps
1. [x] **DataTable** — `src/components/data-table/` (`DataTable.tsx`, `types.ts`), styles in `v2.css`; TanStack Table for sort/paging/selection state. Proof: `tests/ui/data-table.test.tsx` (sort, filter, search, paging, custom render, empty/loading/error).
2. [x] **Episode list page** — rewrite the list in `ProjectViews.tsx` onto DataTable (columns number, title+topic, scenes, duration estimate, status/progress, cost, updated; default sort by number; status filter with counts), page header with stats and actions; move the skills table to DataTable. Proof: screen at http://localhost:3300 (empty, loading, populated, phone width).
3. [x] **New episode with AI** — `suggest-topics` gets series roadmap, bible premise and episode states (`RecentVideo` grows `number`, `goal`; input adds `premise`); new `analyze-topic` task with `analyzeProblems()` machine check (duplicate of an existing episode, order gap) and one repair; `episodeService.analyzeTopic`, route `POST /channels/:id/analyze-topic`; "Tập mới" panel UI (suggest, analyse, create). Proof: tests with LLM mocked (valid, invalid, repair, no-AI-configured), screen.
4. [x] **Setup checklist** — rewrite `SetupChecklist.tsx`: tick/circle list, progress, per-item "AI làm" (`AskAiButton` with a prompt built per item in `src/features/v2/lib/setup-prompts.ts`), price shown for picture parts, collapses when complete. Proof: unit test of the prompt builder, screen.

## Files touched
| Area | File | Change |
| --- | --- | --- |
| ui | `src/components/data-table/*`, `src/app/(studio)/v2.css` | new shared component and styles |
| ui | `src/features/v2/views/ProjectViews.tsx`, `SetupChecklist.tsx`, new `NewEpisodePanel.tsx`, `lib/setup-prompts.ts` | rewrite |
| core | `src/core/tasks/suggest-topics.ts`, new `analyze-topic.ts` | extend / add |
| server | `episode.service.ts`, `episode.types.ts`, `src/app/api/v1/channels/[id]/analyze-topic/route.ts` | service call + route |
| ui | `src/features/episode/services/episode.api.ts`, `features/usage/lib/format.ts` | client call, Vietnamese task label |
| tests | `tests/ui/data-table.test.tsx`, `tests/core/analyze-topic.test.ts`, `tests/server/topic-ideas.test.ts` | new |

## Data
None. No new table or column. Episode cost comes from the existing `usage_events` summaries.

## Paid calls and jobs
Two model calls, both only when the person presses a button: "Gợi ý chủ đề" (`suggest-topics`, as today) and "Phân tích" (`analyze-topic`, one call plus at most one repair). Both tagged with `withUsage({ channelId, purpose })`, estimate shown before running. Short single calls like `topicIdeas` today, not worker jobs; if they grow past one call they move to the worker. Pictures on the setup checklist stay the existing `draw_library` / `generate_art` jobs, which already refuse to pay twice.

## Risks
- DataTable is a shared component: a bad API spreads. Mitigation: only the episode and skills tables use it in this dossier, props documented in the file header.
- v2 CSS is scoped to `.v2`; the component must render inside it. Mitigation: classes live in `v2.css`, no Tailwind.
- Suggestions can invent facts about the story: the prompt requires naming the episode a suggestion follows from, and `analyzeProblems` flags duplicates.
- Rollback: pure UI and two tasks; revert the commit, drop the dependency.

## Proof
Tests per step (above), `npm run check`, and the screen used at http://localhost:3300 for steps 2 to 4, including a real "Gợi ý chủ đề" and "Phân tích" call (cost a few cents; tell the owner before spending).
