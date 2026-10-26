import { runChecks, type QualityIssue } from '../../quality/check';
import type { PipelineStep } from '../step';
import type { AssembleOutput, ProductionContext, RenderOutput } from '../production';

export const qualityStep: PipelineStep<ProductionContext, { issues: QualityIssue[] }> = {
  id: 'quality',
  label: 'Kiểm tra tự động',
  after: ['render', 'assemble'],
  weight: 2,
  inputs: () => ({}),
  async run({ deps, episode, format, slots, bible }, prev) {
    const { durations } = prev.render as RenderOutput;
    const { renders } = prev.assemble as AssembleOutput;
    const issues = runChecks(deps.checks, {
      stage: 'video',
      episode,
      scenes: episode.scenes,
      format,
      slots,
      bible,
      sceneSeconds: new Map(episode.scenes.map((s, i) => [s.id, durations[i] ?? 0])),
      totalSeconds: renders[0]?.durationSec ?? durations.reduce((a, b) => a + b, 0),
    });
    for (const i of issues) await deps.episodes.addEvent(episode.id, `Kiểm tra: ${i.message}`);
    return { issues };
  },
};
