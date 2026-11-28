// Extension point: Assistant tool.
// Everything an AI can do in the studio is a tool: one class, used the same way by the built-in Assistant and by MCP.
// A tool says its name, arguments, result and risk, and writes only `execute`; `run` is the same for all of them.
// Tools live in src/server/assistant/tools, one per file (they need the services); this contract is framework-free.
import type { z } from 'zod';

import { UserFacingError } from '@/core/domain/errors';

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
  /** The project the call works in; tools refuse ids of any other. */
  channelId: string;
  /** Only the Assistant has a conversation and a place the person is looking at. */
  threadId?: string;
  focus?: AssistantFocus;
  /** The level of the connection code, when an outside AI is calling. */
  access?: AccessLevel;
}

export interface ToolResult<Output = unknown> {
  ok: boolean;
  /** What the model reads next. Keep it short and factual. */
  message: string;
  /** What the tool returned, as its output schema describes it. */
  output?: Output;
  /** Optional structured data shown or used by the UI. */
  data?: unknown;
}

/** workspace: not tied to one project. */
export type ToolScope = 'workspace' | 'project';
/** Who is offered the tool. */
export type ToolSurface = 'assistant' | 'mcp';
/** What a connection code may do; each level includes the ones before it. */
export type AccessLevel = 'read' | 'edit' | 'full';

export function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues.slice(0, 6).map((i) => `${i.path.map(String).join('.') || '(gốc)'}: ${i.message}`).join('; ');
}

export abstract class StudioTool<Input = any, Output = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Stable: stored in chat history and call records. */
  abstract readonly name: string;
  /** Short name for people. */
  abstract readonly title: string;
  /** For the model: what it does and when to use it. Put the quality guidance for content it writes here. */
  abstract readonly description: string;
  abstract readonly risk: ToolRisk;
  readonly scope: ToolScope = 'project';
  readonly surfaces: readonly ToolSurface[] = ['assistant', 'mcp'];
  /** Set when the risk alone would let too low a level through. */
  readonly minLevel?: AccessLevel;
  abstract readonly input: z.ZodType<Input>;
  abstract readonly output: z.ZodType<Output>;

  /** One line for people, shown in the log and on the approval card ("Tạo ảnh cho 3 cảnh của video X"). */
  abstract summarize(input: Input, ctx: ToolContext): string | Promise<string>;
  /** The work. Calls the same services the screens use; throws UserFacingError to refuse. */
  protected abstract execute(input: Input, ctx: ToolContext): Promise<Output>;
  /** The result as the model reads it. */
  abstract present(output: Output): string;

  async run(raw: unknown, ctx: ToolContext): Promise<ToolResult<Output>> {
    const input = this.input.safeParse(raw);
    if (!input.success) return { ok: false, message: `Tham số không hợp lệ: ${formatIssues(input.error)}` };
    try {
      const output = await this.execute(input.data, ctx);
      // The work is already done, so a result that does not match its schema is reported, not turned into a failure.
      const checked = this.output.safeParse(output);
      if (!checked.success) console.warn(`Tool ${this.name} returned an unexpected result: ${formatIssues(checked.error)}`);
      return { ok: true, message: this.present(output), output };
    } catch (e) {
      return { ok: false, message: e instanceof UserFacingError ? e.message : `Lỗi: ${String((e as Error)?.message ?? e).slice(0, 300)}` };
    }
  }
}

/** The earlier object shape, wrapped as a StudioTool while the tools move to one class each. */
export interface ToolDefinition<Args> {
  name: string;
  description: string;
  risk: ToolRisk;
  schema: z.ZodType<Args>;
  summarize(args: Args, ctx: ToolContext): string | Promise<string>;
  run(args: Args, ctx: ToolContext): Promise<ToolResult>;
}

class DefinedTool<Args> extends StudioTool<Args, ToolResult> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly input: z.ZodType<Args>;
  readonly output = undefined as never;

  constructor(private readonly def: ToolDefinition<Args>) {
    super();
    this.name = this.title = def.name;
    this.description = def.description;
    this.risk = def.risk;
    this.input = def.schema;
  }

  summarize(args: Args, ctx: ToolContext) {
    return this.def.summarize(args, ctx);
  }
  protected execute(args: Args, ctx: ToolContext) {
    return this.def.run(args, ctx);
  }
  present(result: ToolResult) {
    return result.message;
  }

  override async run(raw: unknown, ctx: ToolContext): Promise<ToolResult<ToolResult>> {
    try {
      return (await this.def.run(this.input.parse(raw), ctx)) as ToolResult<ToolResult>;
    } catch (e) {
      return { ok: false, message: e instanceof UserFacingError ? e.message : `Lỗi: ${String((e as Error)?.message ?? e).slice(0, 300)}` };
    }
  }
}

export function defineTool<Args>(def: ToolDefinition<Args>): StudioTool<Args> {
  return new DefinedTool(def);
}

/** Whether a call must wait for the person's approval in this mode. */
export function needsApproval(risk: ToolRisk, mode: PermissionMode): boolean {
  if (mode === 'bypass' || risk === 'read') return false;
  if (mode === 'ask') return true;
  return risk === 'paid' || risk === 'destructive';
}

export function validateTools(tools: StudioTool[]): void {
  const seen = new Set<string>();
  for (const t of tools) {
    if (!/^[a-z][a-z0-9_]*$/.test(t.name)) throw new Error(`Invalid assistant tool name: ${t.name}`);
    if (seen.has(t.name)) throw new Error(`Duplicate assistant tool: ${t.name}`);
    seen.add(t.name);
  }
}
