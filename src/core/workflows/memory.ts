import { runTask } from '../agent/runner';
import type { CoreDeps } from '../ports';
import { summarizeEpisodeTask } from '../tasks/summarize-episode';

import { buildContext } from './context';

/** Writes the series memory entry for an approved episode (no-op for one-off videos). */
export async function summarizeEpisode(deps: CoreDeps, episodeId: string): Promise<void> {
  const episode = await deps.episodes.get(episodeId);
  if (!episode.seriesId) return;
  const ctx = await buildContext(deps, episode);
  const note = await runTask({ llm: deps.llm, runs: deps.aiRuns, layers: deps.layers }, summarizeEpisodeTask, { title: episode.title, scenes: episode.scenes }, ctx);
  await deps.memory.save({ episodeId, seriesId: episode.seriesId, number: episode.number, title: episode.title, ...note, createdAt: new Date().toISOString() });
  await deps.episodes.addEvent(episodeId, 'Đã ghi bộ nhớ series cho tập này');
}
