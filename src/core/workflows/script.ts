// AI script workflows. All AI access goes through runTask (context, validation, run log).
import { runTask } from '../agent/runner';
import type { ContextInput } from '../context/layer';
import type { Episode } from '../domain/episode';
import type { CoreDeps, ProgressFn } from '../ports';
import { applyPublishTemplate, emptyPublishKit } from '../script/publish';
import { carryOver, imageStyleOf } from '../scenes/assets';
import { assembleScenes, draftFromScenes, type ScriptDraft } from '../script/script';
import { planStoryTask, type StoryPlan } from '../tasks/plan-story';
import { reviseEpisodeTask } from '../tasks/revise-episode';
import { smoothNarrationTask } from '../tasks/smooth-narration';
import { writeEpisodeTask } from '../tasks/write-episode';

import { buildContext, templateVars } from './context';

async function save(deps: CoreDeps, episode: Episode, draft: ScriptDraft, note: string): Promise<Episode> {
  const ctx = await buildContext(deps, episode);
  const vars = templateVars(ctx, draft.title);
  const updated = await deps.episodes.update(episode.id, {
    title: draft.title,
    scenes: carryOver(episode.scenes, assembleScenes(ctx.slots, draft, vars, deps.tools), { tools: deps.tools, channelStyle: imageStyleOf(ctx), voice: episode.voice }),
    publish: applyPublishTemplate(draft.publish, ctx.series?.version.publish ?? null, vars),
    status: 'script_review',
    // Pin the rules this script was written with.
    seriesVersion: ctx.series ? ctx.series.version.version : null,
    knowledgeVersion: ctx.knowledge?.version ?? null,
  });
  await deps.episodes.addEvent(episode.id, note);
  await deps.events.publish({ type: 'episode.script_ready', episodeId: episode.id });
  return updated;
}

/** The smoothing pass only touches narration; if it fails or comes back malformed, the written script stands. */
async function smoothDraft(runner: Parameters<typeof runTask>[0], draft: ScriptDraft, plan: StoryPlan, ctx: ContextInput): Promise<{ draft: ScriptDraft; smoothed: boolean }> {
  const refs = Object.entries(draft.slots).flatMap(([slot, list]) => list.map((_, i) => ({ slot, i })));
  if (refs.length < 2) return { draft, smoothed: true };
  try {
    const lines = await runTask(runner, smoothNarrationTask, { plan, lines: refs.map((r) => draft.slots[r.slot]![r.i]!.narration) }, ctx);
    const slots = Object.fromEntries(Object.entries(draft.slots).map(([k, v]) => [k, v.map((s) => ({ ...s }))]));
    refs.forEach((r, n) => (slots[r.slot]![r.i]!.narration = lines[n]!));
    return { draft: { ...draft, slots }, smoothed: true };
  } catch {
    return { draft, smoothed: false };
  }
}

export async function writeScript(deps: CoreDeps, episodeId: string, progress: ProgressFn): Promise<Episode> {
  const episode = await deps.episodes.get(episodeId);
  const ctx = await buildContext(deps, episode);
  const runner = { llm: deps.llm, runs: deps.aiRuns, layers: deps.layers };
  // Three steps: plan the story, write the scenes to the plan, then read it as one voice-over and smooth the joins.
  progress(0.05, 'plan');
  const aiSlots = ctx.slots.filter((s) => s.fill === 'ai');
  const scenes = Math.max(2, Math.round(aiSlots.reduce((n, s) => n + (s.scenes.min + s.scenes.max) / 2, 0)));
  const plan = await runTask(runner, planStoryTask, { scenes, slots: aiSlots.map((s) => `${s.name}: ${s.scenes.min === s.scenes.max ? s.scenes.min : `${s.scenes.min}-${s.scenes.max}`} cảnh`).join('; ') }, ctx);
  progress(0.35, 'ai');
  const written = await runTask(runner, writeEpisodeTask(deps.tools), { plan }, ctx);
  progress(0.75, 'smooth');
  const { draft, smoothed } = await smoothDraft(runner, written, plan, ctx);
  return save(deps, episode, draft, `AI đã dựng mạch chuyện và viết xong kịch bản, chờ duyệt${smoothed ? '' : ' (chưa làm mượt được lời đọc, dùng nút Biên tập mạch chuyện nếu thấy rời rạc)'}`);
}

export async function reviseScript(deps: CoreDeps, episodeId: string, feedback: string, progress: ProgressFn): Promise<Episode> {
  const episode = await deps.episodes.get(episodeId);
  const ctx = await buildContext(deps, episode);
  progress(0.1, 'ai');
  const current = draftFromScenes(episode.title, episode.scenes, episode.publish ?? emptyPublishKit());
  const draft = await runTask({ llm: deps.llm, runs: deps.aiRuns, layers: deps.layers }, reviseEpisodeTask(deps.tools), { current, feedback }, ctx);
  return save(deps, episode, draft, `AI đã sửa kịch bản theo yêu cầu: ${feedback}`);
}

/** Imported script (manual mode): same validation and assembly as an AI-written one. */
export async function importScript(deps: CoreDeps, episodeId: string, draft: ScriptDraft): Promise<Episode> {
  return save(deps, await deps.episodes.get(episodeId), draft, 'Đã nhập kịch bản dán từ Claude');
}
