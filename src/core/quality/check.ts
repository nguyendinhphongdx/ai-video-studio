// Extension point: Quality check.
// Rules that run automatically on a script (before approval) or on a render (after production).
// Results are shown next to the scenes; they warn, they never silently change content.
import type { Episode, Scene } from '../domain/episode';
import type { SeriesBible } from '../domain/series';
import type { EpisodeFormat, Slot } from '../series/format';

export type QualityStage = 'script' | 'video';

export interface QualityIssue {
  check: string;
  level: 'error' | 'warning';
  message: string;
  sceneId?: string;
}

export interface QualityInput {
  stage: QualityStage;
  episode: Episode;
  scenes: Scene[];
  format: EpisodeFormat;
  slots: Slot[];
  bible: SeriesBible | null;
  /** Seconds per scene id: estimated for scripts, measured for renders. */
  sceneSeconds: Map<string, number>;
  totalSeconds: number;
}

export interface QualityCheck {
  id: string;
  name: string;
  stages: QualityStage[];
  run(input: QualityInput): QualityIssue[];
}

export function runChecks(checks: QualityCheck[], input: QualityInput): QualityIssue[] {
  return checks.filter((c) => c.stages.includes(input.stage)).flatMap((c) => c.run(input));
}
