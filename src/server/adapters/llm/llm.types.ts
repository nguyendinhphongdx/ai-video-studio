import type { z } from 'zod';

import type { ChatMessage, ChatToolCall, ChatToolSpec } from '@/core/ports';

/** Tokens a call used, as the provider reported them. `input` excludes what was served from the cache. */
export interface LlmUsage {
  input: number;
  output: number;
  cached: number;
}

export interface LlmClient {
  generateObject(input: { system: string; user: string; schema: z.ZodType }): Promise<{ object: unknown; usage?: LlmUsage }>;
  chat(input: { system: string; messages: ChatMessage[]; tools: ChatToolSpec[] }): Promise<{ text: string; toolCalls: ChatToolCall[]; usage?: LlmUsage }>;
  /** Tiny request to check the connection; returns the model that answered. */
  ping(): Promise<string>;
}

/** JSON Schema of a tool's arguments without the $schema marker providers reject. */
export function toolSchema(schema: z.ZodType, toJSONSchema: (s: z.ZodType) => Record<string, unknown>): Record<string, unknown> {
  const { $schema: _s, ...rest } = toJSONSchema(schema);
  return rest;
}
