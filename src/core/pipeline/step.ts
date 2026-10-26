// Extension point: Pipeline step.
// Production is a small graph of steps (voice -> render -> assemble -> quality). Each step declares
// what it depends on and what its inputs are; outputs are cached by an input hash, so "Thử lại" resumes
// from the failed step and a new step (subtitles, thumbnail) plugs in without touching the others.
import type { ProgressFn, StepRunStore } from '../ports';

export interface PipelineStep<Ctx, Out = unknown> {
  id: string;
  label: string;
  after: string[];
  /** Share of the progress bar. */
  weight: number;
  /** Everything (besides earlier steps' outputs) that changes this step's result. */
  inputs(ctx: Ctx): unknown;
  /** Whether cached outputs are still usable (e.g. files still on disk). */
  reusable?(ctx: Ctx, outputs: Out): Promise<boolean>;
  run(ctx: Ctx, prev: Record<string, unknown>, progress: (fraction: number) => void): Promise<Out>;
}

/** FNV-1a over stable JSON: enough to detect changed inputs, no crypto dependency. */
export function hashOf(value: unknown): string {
  const json = JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function orderSteps<Ctx>(steps: PipelineStep<Ctx>[]): PipelineStep<Ctx>[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const out: PipelineStep<Ctx>[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (s: PipelineStep<Ctx>) => {
    if (state.get(s.id) === 'done') return;
    if (state.get(s.id) === 'visiting') throw new Error(`Pipeline cycle at step ${s.id}`);
    state.set(s.id, 'visiting');
    for (const dep of s.after) {
      const d = byId.get(dep);
      if (!d) throw new Error(`Step ${s.id} depends on unknown step ${dep}`);
      visit(d);
    }
    state.set(s.id, 'done');
    out.push(s);
  };
  steps.forEach(visit);
  return out;
}

export async function runPipeline<Ctx>(
  steps: PipelineStep<Ctx>[],
  ctx: Ctx,
  opts: { episodeId: string; store: StepRunStore; progress: ProgressFn },
): Promise<Record<string, unknown>> {
  const ordered = orderSteps(steps);
  const total = ordered.reduce((a, s) => a + s.weight, 0) || 1;
  const outputs: Record<string, unknown> = {};
  let done = 0;
  for (const step of ordered) {
    const prev = Object.fromEntries(step.after.map((d) => [d, outputs[d]]));
    const inputsHash = hashOf({ inputs: step.inputs(ctx), prev });
    const cached = await opts.store.get(opts.episodeId, step.id);
    const base = done / total;
    opts.progress(base, step.id);
    if (cached && cached.inputsHash === inputsHash && (!step.reusable || (await step.reusable(ctx, cached.outputs)))) {
      outputs[step.id] = cached.outputs;
    } else {
      outputs[step.id] = await step.run(ctx, prev, (f) => opts.progress(base + (step.weight * Math.max(0, Math.min(1, f))) / total, step.id));
      await opts.store.save(opts.episodeId, step.id, inputsHash, outputs[step.id]);
    }
    done += step.weight;
  }
  opts.progress(1, 'done');
  return outputs;
}
