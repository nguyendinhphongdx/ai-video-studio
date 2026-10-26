import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { latestFocus, resolveApproval, runAssistantTurn, toChatMessages, unresolvedCalls, type AssistantRuntime } from '@/core/assistant/loop';
import { defineTool, needsApproval, validateTools, type PermissionMode, type ToolContext, type ToolRisk } from '@/core/assistant/tool';
import type { AssistantMessage, AssistantStore, AssistantThreadInfo, ChatMessage, ChatToolCall, LlmPort } from '@/core/ports';

function memoryStore(mode: PermissionMode): AssistantStore & { all: AssistantMessage[] } {
  const all: AssistantMessage[] = [];
  const thread: AssistantThreadInfo = { id: 't1', channelId: 'c1', title: '', mode };
  return {
    all,
    thread: async () => thread,
    messages: async () => all.map((m) => ({ ...m })),
    append: async (threadId, m) => {
      const row = { ...m, id: all.length + 1, threadId, createdAt: '' };
      all.push(row);
      return row;
    },
    update: async (id, patch) => void Object.assign(all.find((m) => m.id === id)!, patch),
  };
}

const user = (store: ReturnType<typeof memoryStore>, content: string, focus: unknown = { route: '/episodes/e1', episodeId: 'e1' }) =>
  store.append('t1', { role: 'user', content, toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus });

/** An LLM that plays a script: each entry is the model's answer to the next call. */
function scripted(steps: { text?: string; calls?: Omit<ChatToolCall, 'id'>[] }[], seen: ChatMessage[][] = []): LlmPort {
  let n = 0;
  return {
    isReady: async () => true,
    generateObject: async () => ({ object: {}, model: 'x' }),
    chat: async ({ messages }) => {
      seen.push(messages);
      const s = steps[n++] ?? { text: 'hết' };
      return { text: s.text ?? '', toolCalls: (s.calls ?? []).map((c, i) => ({ ...c, id: `call${n}_${i}` })), model: 'fake' };
    },
  };
}

function tool(name: string, risk: ToolRisk, log: string[], schema: z.ZodType = z.object({ x: z.string().optional() })) {
  return defineTool({
    name,
    description: name,
    risk,
    schema,
    summarize: (a) => `${name}(${JSON.stringify(a)})`,
    run: async (a: unknown, ctx: ToolContext) => {
      log.push(`${name}:${ctx.focus.episodeId}`);
      return { ok: true, message: `ok ${name}`, data: a };
    },
  });
}

const runtime = (store: AssistantStore, llm: LlmPort, tools: ReturnType<typeof tool>[]): AssistantRuntime => ({ llm, store, tools, system: async () => 'SYSTEM' });

describe('permission modes', () => {
  const cases: [PermissionMode, ToolRisk, boolean][] = [
    ['ask', 'read', false], ['ask', 'write', true], ['ask', 'paid', true], ['ask', 'destructive', true],
    ['auto', 'read', false], ['auto', 'write', false], ['auto', 'paid', true], ['auto', 'destructive', true],
    ['bypass', 'read', false], ['bypass', 'write', false], ['bypass', 'paid', false], ['bypass', 'destructive', false],
  ];
  it.each(cases)('%s mode, %s tool: needs approval = %s', (mode, risk, expected) => expect(needsApproval(risk, mode)).toBe(expected));

  it('rejects duplicate or badly named tools', () => {
    expect(() => validateTools([tool('a', 'read', []), tool('a', 'write', [])])).toThrow(/Duplicate/);
    expect(() => validateTools([tool('Bad-Name', 'read', [])])).toThrow(/Invalid/);
  });
});

describe('assistant turn', () => {
  it('answers in plain text without tools', async () => {
    const store = memoryStore('auto');
    await user(store, 'Chào');
    expect(await runAssistantTurn(runtime(store, scripted([{ text: 'Chào bạn!' }]), []), 't1')).toBe('done');
    expect(store.all.map((m) => [m.role, m.content])).toEqual([['user', 'Chào'], ['assistant', 'Chào bạn!']]);
  });

  it('runs read and write tools straight away in auto mode, feeds results back, and passes the focus', async () => {
    const log: string[] = [];
    const seen: ChatMessage[][] = [];
    const store = memoryStore('auto');
    await user(store, 'Sửa cảnh');
    const llm = scripted([{ calls: [{ name: 'look', args: {} }, { name: 'edit', args: { x: 'hi' } }] }, { text: 'Xong rồi.' }], seen);
    expect(await runAssistantTurn(runtime(store, llm, [tool('look', 'read', log), tool('edit', 'write', log)]), 't1')).toBe('done');
    expect(log).toEqual(['look:e1', 'edit:e1']);
    expect(store.all.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'tool', 'assistant']);
    expect(seen[1]!.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'tool']);
    expect(seen[1]!.filter((m) => m.role === 'tool').map((m) => m.content)).toEqual(['ok look', 'ok edit']);
  });

  it('pauses on a paid tool in auto mode, then continues after approval', async () => {
    const log: string[] = [];
    const store = memoryStore('auto');
    await user(store, 'Tạo ảnh');
    const rt = runtime(store, scripted([{ calls: [{ name: 'make', args: { x: '3 ảnh' } }, { name: 'edit', args: {} }] }, { text: 'Đã tạo.' }]), [tool('make', 'paid', log), tool('edit', 'write', log)]);
    expect(await runAssistantTurn(rt, 't1')).toBe('awaiting');
    expect(log).toEqual([]);
    const waiting = store.all.find((m) => m.status === 'awaiting')!;
    expect(waiting).toMatchObject({ toolName: 'make', summary: 'make({"x":"3 ảnh"})' });
    expect(await runAssistantTurn(rt, 't1')).toBe('awaiting'); // still waiting: nothing is repeated
    await resolveApproval(rt, waiting.id, 't1', true);
    expect(log).toEqual(['make:e1']);
    expect(await runAssistantTurn(rt, 't1')).toBe('done');
    expect(log).toEqual(['make:e1', 'edit:e1']);
    expect(store.all.at(-1)).toMatchObject({ role: 'assistant', content: 'Đã tạo.' });
  });

  it('tells the model when the person says no, and does not run the tool', async () => {
    const log: string[] = [];
    const seen: ChatMessage[][] = [];
    const store = memoryStore('ask');
    await user(store, 'Sửa');
    const rt = runtime(store, scripted([{ calls: [{ name: 'edit', args: {} }] }, { text: 'Ok, mình hỏi lại.' }], seen), [tool('edit', 'write', log)]);
    expect(await runAssistantTurn(rt, 't1')).toBe('awaiting');
    await resolveApproval(rt, store.all.find((m) => m.status === 'awaiting')!.id, 't1', false);
    expect(await runAssistantTurn(rt, 't1')).toBe('done');
    expect(log).toEqual([]);
    expect(seen[1]!.at(-1)).toMatchObject({ role: 'tool', isError: true });
    expect(seen[1]!.at(-1)!.content).toMatch(/từ chối/);
    await expect(resolveApproval(rt, 2, 't1', true)).rejects.toThrow(/đã được xử lý/);
  });

  it('never asks in bypass mode, even for destructive tools', async () => {
    const log: string[] = [];
    const store = memoryStore('bypass');
    await user(store, 'Xoá');
    expect(await runAssistantTurn(runtime(store, scripted([{ calls: [{ name: 'wipe', args: {} }] }, { text: 'Đã xoá.' }]), [tool('wipe', 'destructive', log)]), 't1')).toBe('done');
    expect(log).toEqual(['wipe:e1']);
  });

  it('asks about every change in ask mode but runs reads freely', async () => {
    const log: string[] = [];
    const store = memoryStore('ask');
    await user(store, 'Xem rồi sửa');
    const rt = runtime(store, scripted([{ calls: [{ name: 'look', args: {} }, { name: 'edit', args: {} }] }]), [tool('look', 'read', log), tool('edit', 'write', log)]);
    expect(await runAssistantTurn(rt, 't1')).toBe('awaiting');
    expect(log).toEqual(['look:e1']);
  });

  it('returns validation errors and unknown tools to the model so it can correct itself', async () => {
    const store = memoryStore('auto');
    await user(store, 'Thử');
    const strict = tool('edit', 'write', [], z.object({ count: z.number() }));
    const llm = scripted([{ calls: [{ name: 'edit', args: { count: 'nhiều' } }, { name: 'ghost', args: {} }] }, { calls: [{ name: 'edit', args: { count: 3 } }] }, { text: 'ok' }]);
    expect(await runAssistantTurn(runtime(store, llm, [strict]), 't1')).toBe('done');
    const tools = store.all.filter((m) => m.role === 'tool');
    expect(tools.map((m) => m.status)).toEqual(['error', 'error', 'done']);
    expect(tools[0]!.content).toMatch(/Tham số không hợp lệ: count/);
    expect(tools[1]!.content).toMatch(/Không có công cụ "ghost"/);
  });

  it('sends provider data of a call (Gemini thought signature) back untouched with the next request', async () => {
    const seen: ChatMessage[][] = [];
    const store = memoryStore('auto');
    await user(store, 'Thiết kế');
    const meta = { google: { thought_signature: 'abc123' } };
    const llm = scripted([{ calls: [{ name: 'look', args: {}, meta }] }, { text: 'Xong.' }], seen);
    await runAssistantTurn(runtime(store, llm, [tool('look', 'read', [])]), 't1');
    expect(seen[1]!.find((m) => m.role === 'assistant')!.toolCalls![0]!.meta).toEqual(meta);
  });

  it('turns a failing tool into an error result instead of crashing the turn', async () => {
    const store = memoryStore('auto');
    await user(store, 'Lỗi');
    const boom = defineTool({ name: 'boom', description: '', risk: 'write' as const, schema: z.object({}), summarize: () => 'boom', run: async () => { throw new Error('hỏng rồi'); } });
    expect(await runAssistantTurn({ llm: scripted([{ calls: [{ name: 'boom', args: {} }] }, { text: 'Mình báo lỗi.' }]), store, tools: [boom], system: async () => 'S' }, 't1')).toBe('done');
    expect(store.all.find((m) => m.role === 'tool')).toMatchObject({ status: 'error', content: expect.stringContaining('hỏng rồi') });
  });

  it('stops after the step limit and says so', async () => {
    const store = memoryStore('auto');
    await user(store, 'Lặp');
    const rt = { ...runtime(store, scripted(Array.from({ length: 10 }, () => ({ calls: [{ name: 'look', args: {} }] }))), [tool('look', 'read', [])]), maxSteps: 3 };
    expect(await runAssistantTurn(rt, 't1')).toBe('steps_exceeded');
    expect(store.all.at(-1)!.content).toMatch(/dừng lại/);
  });
});

describe('conversation helpers', () => {
  const msg = (over: Partial<AssistantMessage>): AssistantMessage => ({ id: 1, threadId: 't', role: 'user', content: '', toolCalls: [], toolCallId: null, toolName: null, status: 'done', summary: '', data: null, focus: null, createdAt: '', ...over });

  it('finds the calls that still lack an answer, and the latest focus', () => {
    const msgs = [
      msg({ id: 1, focus: { route: '/a', sceneId: 's1' } }),
      msg({ id: 2, role: 'assistant', toolCalls: [{ id: 'c1', name: 'a', args: {} }, { id: 'c2', name: 'b', args: {} }] }),
      msg({ id: 3, role: 'tool', toolCallId: 'c1', toolName: 'a' }),
    ];
    expect(unresolvedCalls(msgs).map((c) => c.id)).toEqual(['c2']);
    expect(latestFocus(msgs)).toMatchObject({ route: '/a', sceneId: 's1', episodeId: null });
    expect(unresolvedCalls([...msgs, msg({ id: 4, role: 'tool', toolCallId: 'c2', toolName: 'b' })])).toEqual([]);
  });

  it('keeps the model history starting at a user message so no tool result loses its call', () => {
    const msgs: AssistantMessage[] = Array.from({ length: 120 }, (_, i) => msg({ id: i + 1, role: i % 3 === 0 ? 'user' : i % 3 === 1 ? 'assistant' : 'tool', toolCalls: i % 3 === 1 ? [{ id: `c${i}`, name: 'a', args: {} }] : [], toolCallId: i % 3 === 2 ? `c${i - 1}` : null }));
    const chat = toChatMessages(msgs);
    expect(chat[0]!.role).toBe('user');
    expect(chat.length).toBeLessThanOrEqual(80);
  });
});
