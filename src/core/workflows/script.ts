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
import { reviewScriptTask } from '../tasks/review-script';
import { runChecks } from '../quality/check';
import { buildTimeline, estimateSpeechSec } from '../timeline';

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

function draftIssues(deps: CoreDeps, episode: Episode, draft: ScriptDraft, ctx: ContextInput, vars: ReturnType<typeof templateVars>) {
  const scenes = assembleScenes(ctx.slots, draft, vars, deps.tools);
  const timeline = buildTimeline(scenes, (ref) => deps.tools.block(ref)?.minSeconds ?? 3, (s) => estimateSpeechSec(s.narration));
  const issues = runChecks(deps.checks, { stage: 'script', episode, scenes, format: ctx.format, slots: ctx.slots, bible: ctx.series?.version.bible ?? null, sceneSeconds: new Map(timeline.scenes.map((t) => [t.sceneId, t.duration])), totalSeconds: timeline.total, tools: deps.tools });
  // Scene numbers count only the AI-written scenes, the ones a revision can change.
  const written = scenes.filter((s) => !s.locked);
  return issues.map((i) => {
    const n = written.findIndex((s) => s.id === i.sceneId);
    return n < 0 ? i.message : `Cảnh ${n + 1}: ${i.message}`;
  });
}

/**
 * The harness around the writer: automatic checks plus a second AI reader, then one revision for what they found,
 * so the person reviews a script that already passed. It never loses work: any failure keeps the draft.
 */
async function selfReview(deps: CoreDeps, episode: Episode, draft: ScriptDraft, ctx: ContextInput, progress: ProgressFn): Promise<{ draft: ScriptDraft; note: string }> {
  const runner = { llm: deps.llm, runs: deps.aiRuns, layers: deps.layers };
  const vars = templateVars(ctx, draft.title);
  try {
    progress(0.8, 'check');
    const automatic = draftIssues(deps, episode, draft, ctx, vars);
    const review = await runTask(runner, reviewScriptTask, { draft }, ctx).catch(() => []);
    const found = [...automatic, ...review.map((r) => `${r.scene ? `Cảnh ${r.scene}: ` : ''}${r.problem} Cách sửa: ${r.fix}`)];
    if (!found.length) return { draft, note: ', đã tự soát' };
    progress(0.88, 'fix');
    const fixed = await runTask(runner, reviseEpisodeTask(deps.tools), { current: draft, feedback: `Bản soát tự động tìm thấy các lỗi sau, hãy sửa hết:\n- ${found.join('\n- ')}` }, ctx);
    // A revision that breaks more automatic rules than it fixes is thrown away.
    if (draftIssues(deps, episode, fixed, ctx, vars).length > automatic.length) return { draft, note: `, tự soát thấy ${found.length} điểm nhưng chưa sửa được` };
    return { draft: fixed, note: `, đã tự soát và sửa ${found.length} điểm` };
  } catch {
    return { draft, note: ', chưa tự soát được' };
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
  const reviewed = await selfReview(deps, episode, draft, ctx, progress);
  return save(deps, episode, reviewed.draft, `AI đã dựng mạch chuyện và viết xong kịch bản${reviewed.note}, chờ duyệt${smoothed ? '' : ' (chưa làm mượt được lời đọc, dùng nút Biên tập mạch chuyện nếu thấy rời rạc)'}`);
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
