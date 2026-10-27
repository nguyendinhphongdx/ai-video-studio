// The only way AI is called. Compiles context, calls the model, validates, records the run.
import { UserFacingError } from '../domain/errors';
import { newId } from '../domain/ids';
import { compileContext, type ContextInput, type ContextLayer } from '../context/layer';
import type { AiRunStore, LlmPort } from '../ports';

import type { AgentTask } from './task';

export interface AiRun {
  id: string;
  task: string;
  taskVersion: number;
  episodeId: string | null;
  seriesId: string | null;
  model: string | null;
  context: string;
  sections: { id: string; title: string; chars: number; truncated: boolean }[];
  prompt: string;
  output: unknown;
  error: string | null;
  durationMs: number;
  createdAt: string;
}

export interface RunnerDeps {
  llm: LlmPort;
  runs: AiRunStore;
  layers: ContextLayer[];
}

export async function runTask<I, O>(deps: RunnerDeps, task: AgentTask<I, O>, input: I, ctx: ContextInput): Promise<O> {
  const compiled = compileContext(deps.layers, ctx, task.layers);
  const prompt = task.prompt(input, ctx);
  const started = Date.now();
  const base = {
    id: newId(),
    task: task.id,
    taskVersion: task.version,
    episodeId: ctx.episode?.id ?? null,
    seriesId: ctx.series?.series.id ?? null,
    context: compiled.text,
    sections: compiled.sections,
    prompt,
    createdAt: new Date().toISOString(),
  };
  let model: string | null = null;
  let raw: unknown = null;
  try {
    const result = await deps.llm.generateObject({ system: compiled.text, user: prompt, schema: task.schema(input, ctx), purpose: task.id });
    model = result.model;
    raw = result.object;
    const output = task.parse(raw, input, ctx);
    await deps.runs.record({ ...base, model, output: raw, error: null, durationMs: Date.now() - started });
    return output;
  } catch (e) {
    const message = e instanceof UserFacingError ? e.message : String((e as Error)?.message ?? e);
    await deps.runs.record({ ...base, model, output: raw, error: message, durationMs: Date.now() - started });
    if (e instanceof UserFacingError) throw e;
    throw new UserFacingError('AI trả về kịch bản không đúng định dạng. Bấm Thử lại.', String((e as Error)?.stack ?? e));
  }
}
