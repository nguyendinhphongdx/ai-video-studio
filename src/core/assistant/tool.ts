// Extension point: Assistant tool.
// The assistant is one chat that can do everything the studio can. Each thing it can do is a tool: a name, a schema for
// its arguments, a risk class and a handler that calls the same services the screens use. Tools live in
// src/server/assistant/tools (they need the services); the loop in loop.ts only knows this contract.
import type { z } from 'zod';

/** read: looks only. write: changes data that is easy to review or undo. paid: calls a paid provider or starts long work. destructive: deletes. */
export type ToolRisk = 'read' | 'write' | 'paid' | 'destructive';

/** ask: confirm every change. auto: confirm only paid and destructive actions. bypass: never confirm. */
export type PermissionMode = 'ask' | 'auto' | 'bypass';
export const PERMISSION_MODES: PermissionMode[] = ['ask', 'auto', 'bypass'];

/** Where the person is in the app when they write; the assistant uses it to resolve "this video", "this scene". */
export interface AssistantFocus {
  route: string;
  episodeId: string | null;
  seriesId: string | null;
  sceneId: string | null;
  skillId: string | null;
}

export interface ToolContext {
  threadId: string;
  channelId: string;
  focus: AssistantFocus;
}

export interface ToolResult {
  ok: boolean;
  /** What the model reads next. Keep it short and factual. */
  message: string;
  /** Optional structured data shown or used by the UI. */
  data?: unknown;
}

export interface AssistantTool<Args = unknown> {
  name: string;
  /** For the model: what it does and when to use it. Put the quality guidance for content it writes here. */
  description: string;
  risk: ToolRisk;
  schema: z.ZodType<Args>;
  /** One line for people, shown in the log and on the approval card ("Tạo ảnh cho 3 cảnh của video X"). */
  summarize(args: Args, ctx: ToolContext): string | Promise<string>;
  run(args: Args, ctx: ToolContext): Promise<ToolResult>;
}

export function defineTool<Args>(tool: AssistantTool<Args>): AssistantTool<Args> {
  return tool;
}

/** Whether a call must wait for the person's approval in this mode. */
export function needsApproval(risk: ToolRisk, mode: PermissionMode): boolean {
  if (mode === 'bypass' || risk === 'read') return false;
  if (mode === 'ask') return true;
  return risk === 'paid' || risk === 'destructive';
}

export function validateTools(tools: AssistantTool[]): void {
  const seen = new Set<string>();
  for (const t of tools) {
    if (!/^[a-z][a-z0-9_]*$/.test(t.name)) throw new Error(`Invalid assistant tool name: ${t.name}`);
    if (seen.has(t.name)) throw new Error(`Duplicate assistant tool: ${t.name}`);
    seen.add(t.name);
  }
}
