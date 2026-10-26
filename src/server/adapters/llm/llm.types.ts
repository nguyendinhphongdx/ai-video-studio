import type { z } from 'zod';

export interface LlmClient {
  generateObject(input: { system: string; user: string; schema: z.ZodType }): Promise<unknown>;
  /** Tiny request to check the connection; returns the model that answered. */
  ping(): Promise<string>;
}
