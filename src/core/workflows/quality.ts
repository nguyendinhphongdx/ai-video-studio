import type { Episode } from '../domain/episode';
import type { CoreDeps } from '../ports';
import { runChecks, type QualityIssue } from '../quality/check';
import { buildTimeline, estimateSpeechSec } from '../timeline';

import { buildContext } from './context';

/** Script-stage checks with estimated timings, shown on the storyboard before approval. */
export async function scriptIssues(deps: CoreDeps, episode: Episode): Promise<QualityIssue[]> {
  if (!episode.scenes.length) return [];
  const ctx = await buildContext(deps, episode);
  const timeline = buildTimeline(episode.scenes, (ref) => deps.tools.block(ref)?.minSeconds ?? 3, (s) => estimateSpeechSec(s.narration));
  return runChecks(deps.checks, {
    stage: 'script',
    episode,
    scenes: episode.scenes,
    format: ctx.format,
    slots: ctx.slots,
    bible: ctx.series?.version.bible ?? null,
    sceneSeconds: new Map(timeline.scenes.map((t) => [t.sceneId, t.duration])),
    totalSeconds: timeline.total,
  });
}
