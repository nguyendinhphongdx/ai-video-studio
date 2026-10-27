// The assistant's conversation loop. Every step is written to the store as it happens, so a turn can stop when a tool
// needs the person's approval and carry on later (resolveApproval, then runAssistantTurn again).
import type { AiRun } from '../agent/runner';
import { UserFacingError } from '../domain/errors';
import { newId } from '../domain/ids';
import type { AiRunStore, AssistantMessage, AssistantStore, AssistantThreadInfo, ChatMessage, ChatToolCall, LlmPort } from '../ports';

import { needsApproval, type AssistantFocus, type AssistantTool, type ToolContext, type ToolResult } from './tool';

export interface AssistantRuntime {
  llm: LlmPort;
  store: AssistantStore;
  tools: AssistantTool[];
  /** System prompt for this thread; it may read fresh data (the channel changes as the assistant works). */
  system(thread: AssistantThreadInfo, focus: AssistantFocus): Promise<string>;
  runs?: AiRunStore;
  /** Model calls per turn before the assistant stops and asks the person to continue. */
  maxSteps?: number;
}

export type TurnState = 'done' | 'awaiting' | 'steps_exceeded';

export const EMPTY_FOCUS: AssistantFocus = { route: '/', episodeId: null, seriesId: null, sceneId: null, skillId: null };
const HISTORY_LIMIT = 80;

const byName = (tools: AssistantTool[]) => new Map(tools.map((t) => [t.name, t]));

/** Calls of the last assistant message that have no answer yet, in order. */
export function unresolvedCalls(messages: AssistantMessage[]): ChatToolCall[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === 'assistant' && m.toolCalls.length) {
      const answered = new Set(messages.slice(i + 1).filter((x) => x.role === 'tool').map((x) => x.toolCallId));
      return m.toolCalls.filter((c) => !answered.has(c.id));
    }
    if (m.role === 'assistant' || m.role === 'user') return [];
  }
  return [];
}

export function latestFocus(messages: AssistantMessage[]): AssistantFocus {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === 'user' && m.focus && typeof m.focus === 'object') return { ...EMPTY_FOCUS, ...(m.focus as Partial<AssistantFocus>) };
  }
  return EMPTY_FOCUS;
}

/** The conversation as the model sees it. Starts at a user message so no tool result is cut from its call. */
export function toChatMessages(messages: AssistantMessage[]): ChatMessage[] {
  let start = Math.max(0, messages.length - HISTORY_LIMIT);
  while (start < messages.length && messages[start]!.role !== 'user') start++;
  return messages.slice(start).flatMap((m): ChatMessage[] => {
    if (m.role === 'user') return [{ role: 'user', content: m.content }];
    if (m.role === 'assistant') return [{ role: 'assistant', content: m.content, ...(m.toolCalls.length ? { toolCalls: m.toolCalls } : {}) }];
    return [{ role: 'tool', toolCallId: m.toolCallId ?? '', content: m.content || m.summary, isError: m.status === 'error' || m.status === 'rejected' }];
  });
}

function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues.slice(0, 6).map((i) => `${i.path.map(String).join('.') || '(gốc)'}: ${i.message}`).join('; ');
}

async function execute(tool: AssistantTool, args: unknown, ctx: ToolContext): Promise<ToolResult> {
  try {
    return await tool.run(args, ctx);
  } catch (e) {
    return { ok: false, message: e instanceof UserFacingError ? e.message : `Lỗi: ${String((e as Error)?.message ?? e).slice(0, 300)}` };
  }
}

async function answer(rt: AssistantRuntime, threadId: string, call: ChatToolCall, outcome: { status: 'done' | 'error' | 'rejected'; content: string; summary: string; data?: unknown }) {
  return rt.store.append(threadId, { role: 'tool', content: outcome.content, toolCalls: [], toolCallId: call.id, toolName: call.name, status: outcome.status, summary: outcome.summary, data: outcome.data ?? null, focus: null });
}

/** Run (or park for approval) one tool call. Returns 'awaiting' when it needs the person. */
async function handleCall(rt: AssistantRuntime, thread: AssistantThreadInfo, focus: AssistantFocus, call: ChatToolCall): Promise<'answered' | 'awaiting'> {
  const tool = byName(rt.tools).get(call.name);
  if (!tool) {
    await answer(rt, thread.id, call, { status: 'error', content: `Không có công cụ "${call.name}". Dùng đúng tên công cụ trong danh sách.`, summary: call.name });
    return 'answered';
  }
  const parsed = tool.schema.safeParse(call.args);
  if (!parsed.success) {
    await answer(rt, thread.id, call, { status: 'error', content: `Tham số không hợp lệ: ${formatIssues(parsed.error)}`, summary: tool.name });
    return 'answered';
  }
  const ctx: ToolContext = { threadId: thread.id, channelId: thread.channelId, focus };
  const summary = await Promise.resolve(tool.summarize(parsed.data, ctx)).catch(() => tool.name);
  if (needsApproval(tool.risk, thread.mode)) {
    await rt.store.append(thread.id, { role: 'tool', content: '', toolCalls: [], toolCallId: call.id, toolName: call.name, status: 'awaiting', summary, data: { risk: tool.risk, args: parsed.data }, focus });
    return 'awaiting';
  }
  const result = await execute(tool, parsed.data, ctx);
  await answer(rt, thread.id, call, { status: result.ok ? 'done' : 'error', content: result.message, summary, data: result.data });
  return 'answered';
}

/**
 * Apply the person's decision on a call waiting for approval. Approved: the tool runs now. Rejected: the model is told.
 * Afterwards the caller starts runAssistantTurn again so the conversation continues.
 */
export async function resolveApproval(rt: AssistantRuntime, messageId: number, threadId: string, approve: boolean): Promise<void> {
  const messages = await rt.store.messages(threadId);
  const m = messages.find((x) => x.id === messageId);
  if (!m || m.role !== 'tool' || m.status !== 'awaiting') throw new UserFacingError('Yêu cầu này đã được xử lý rồi.');
  if (!approve) {
    await rt.store.update(m.id, { status: 'rejected', content: 'Người dùng từ chối thực hiện thao tác này. Hỏi họ muốn làm gì khác.' });
    return;
  }
  const tool = byName(rt.tools).get(m.toolName ?? '');
  const thread = await rt.store.thread(threadId);
  if (!tool) {
    await rt.store.update(m.id, { status: 'error', content: `Không còn công cụ "${m.toolName}".` });
    return;
  }
  const args = (m.data as { args?: unknown } | null)?.args;
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    await rt.store.update(m.id, { status: 'error', content: `Tham số không hợp lệ: ${formatIssues(parsed.error)}` });
    return;
  }
  const result = await execute(tool, parsed.data, { threadId, channelId: thread.channelId, focus: latestFocus(messages) });
  await rt.store.update(m.id, { status: result.ok ? 'done' : 'error', content: result.message, data: result.data ?? null });
}

export async function runAssistantTurn(rt: AssistantRuntime, threadId: string): Promise<TurnState> {
  const thread = await rt.store.thread(threadId);
  const specs = rt.tools.map((t) => ({ name: t.name, description: t.description, schema: t.schema }));
  const maxSteps = rt.maxSteps ?? 12;
  for (let step = 0; step < maxSteps; step++) {
    const messages = await rt.store.messages(threadId);
    if (messages.some((m) => m.role === 'tool' && m.status === 'awaiting')) return 'awaiting';
    const focus = latestFocus(messages);
    const pending = unresolvedCalls(messages);
    if (pending.length) {
      for (const call of pending) if ((await handleCall(rt, thread, focus, call)) === 'awaiting') return 'awaiting';
      continue;
    }
    if (messages.at(-1)?.role === 'assistant') return 'done';
    if (!messages.length) return 'done';

    const system = await rt.system(thread, focus);
    const started = Date.now();
    const history = toChatMessages(messages);
    const res = await rt.llm.chat({ system, messages: history, tools: specs, purpose: 'assistant' });
    await rt.runs?.record({
      id: newId(), task: 'assistant', taskVersion: 1, episodeId: null, seriesId: null, model: res.model, context: system, sections: [], prompt: history.at(-1)?.content ?? '',
      output: { text: res.text, toolCalls: res.toolCalls.map((c) => c.name) }, error: null, durationMs: Date.now() - started, createdAt: new Date().toISOString(),
    } satisfies AiRun);
    await rt.store.append(threadId, { role: 'assistant', content: res.text, toolCalls: res.toolCalls, toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus: null });
    if (!res.toolCalls.length) return 'done';
  }
  await rt.store.append(threadId, { role: 'assistant', content: 'Mình đã làm khá nhiều bước liên tiếp nên dừng lại ở đây. Bạn muốn mình tiếp tục không?', toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus: null });
  return 'steps_exceeded';
}
