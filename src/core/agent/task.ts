// Extension point: Agent task.
// One AI job (write an episode, revise it, summarise it for memory...). A task declares which context
// layers it needs, the output schema and how to validate the result. New AI capability = new task file.
import type { z } from 'zod';

import type { ContextInput, LayerId } from '../context/layer';

export interface AgentTask<Input, Output> {
  id: string;
  /** Bump when the prompt or schema changes; stored with every run. */
  version: number;
  layers: LayerId[] | 'all';
  schema(input: Input, ctx: ContextInput): z.ZodType;
  /** The user message: what to do now. The context layers form the system message. */
  prompt(input: Input, ctx: ContextInput): string;
  /** Turn validated raw output into the task's result (throws on invalid). */
  parse(raw: unknown, input: Input, ctx: ContextInput): Output;
}

export function defineTask<I, O>(task: AgentTask<I, O>): AgentTask<I, O> {
  return task;
}
