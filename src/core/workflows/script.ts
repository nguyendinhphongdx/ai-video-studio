// AI script workflows. All AI access goes through runTask (context, validation, run log).
import { runTask } from '../agent/runner';
import type { Episode } from '../domain/episode';
import type { CoreDeps, ProgressFn } from '../ports';
import { applyPublishTemplate, emptyPublishKit } from '../script/publish';
import { carryOver, imageStyleOf } from '../scenes/assets';
import { assembleScenes, draftFromScenes, type ScriptDraft } from '../script/script';
import { reviseEpisodeTask } from '../tasks/revise-episode';
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

export async function writeScript(deps: CoreDeps, episodeId: string, progress: ProgressFn): Promise<Episode> {
  const episode = await deps.episodes.get(episodeId);
  const ctx = await buildContext(deps, episode);
  progress(0.1, 'ai');
  const draft = await runTask({ llm: deps.llm, runs: deps.aiRuns, layers: deps.layers }, writeEpisodeTask(deps.tools), {}, ctx);
  return save(deps, episode, draft, 'AI đã viết xong kịch bản, chờ duyệt');
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
