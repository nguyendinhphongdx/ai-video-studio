import { runTask } from '../agent/runner';
import type { CoreDeps } from '../ports';
import { rollupSeasonTask } from '../tasks/rollup-season';
import { summarizeEpisodeTask } from '../tasks/summarize-episode';

import { buildContext } from './context';

/** Every this many approved episodes, the memory is folded into the season summary. */
export const ROLLUP_EVERY = 10;

/** Writes the series memory entry for an approved episode (no-op for one-off videos). */
export async function summarizeEpisode(deps: CoreDeps, episodeId: string): Promise<void> {
  const episode = await deps.episodes.get(episodeId);
  if (!episode.seriesId) return;
  const ctx = await buildContext(deps, episode);
  const runner = { llm: deps.llm, runs: deps.aiRuns, layers: deps.layers };
  const note = await runTask(runner, summarizeEpisodeTask, { title: episode.title, scenes: episode.scenes }, ctx);
  await deps.memory.save({ episodeId, seriesId: episode.seriesId, number: episode.number, title: episode.title, ...note, createdAt: new Date().toISOString() });
  await deps.episodes.addEvent(episodeId, 'Đã ghi bộ nhớ series cho tập này');

  const memories = await deps.memory.all(episode.seriesId);
  if (memories.length >= ROLLUP_EVERY && memories.length % ROLLUP_EVERY === 0) {
    const summary = await runTask(runner, rollupSeasonTask, { previous: ctx.memory.season, memories }, ctx);
    await deps.memory.setSeason(episode.seriesId, summary);
    await deps.episodes.addEvent(episodeId, `Đã gộp ${memories.length} tập thành tóm tắt mùa`);
  }
}
