// Streaming through the model port: pieces are passed on, a provider that cannot stream answers whole, a stopped call
// keeps what arrived, and every request lands in the cost ledger.
import { EventSchemas } from '@ag-ui/core/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyEvent, EMPTY_TURN, pendingItems, stepStream, type AssistantEvent } from '@/core/assistant/stream';
import { readStream } from '@/server/adapters/llm/openai';

const env = vi.hoisted(() => ({ chat: null as null | ((input: { onDelta?: (d: { type: 'text' | 'reasoning'; delta: string }) => void; signal?: AbortSignal }) => Promise<unknown>), recorded: [] as { estimated: boolean; usage: { outputTokens: number } }[] }));
vi.mock('@/server/adapters/llm/anthropic', () => ({ anthropicClient: () => ({ chat: (i: never) => env.chat!(i) }) }));
vi.mock('@/server/modules/settings/settings.service', () => ({ isReady: () => true, settingsService: { llm: async () => ({ provider: 'anthropic', model: 'm', apiKey: 'k', baseUrl: '', effort: 'low' }) } }));
vi.mock('@/server/modules/usage/usage.service', () => ({ usageService: { assertWithinBudget: async () => {}, record: async (r: never) => void env.recorded.push(r) } }));

const { llm } = await import('@/server/adapters/llm/llm.service');
const request = { system: 's', messages: [{ role: 'user' as const, content: 'hi' }], tools: [], purpose: 'assistant' };

describe('streaming a model call', () => {
  beforeEach(() => void (env.recorded.length = 0));

  it('passes the pieces on and records the usage the provider reported', async () => {
    env.chat = async (i) => {
      i.onDelta?.({ type: 'text', delta: 'Chào' });
      return { text: 'Chào', toolCalls: [], usage: { input: 10, output: 2, cached: 0 } };
    };
    const seen: string[] = [];
    await expect(llm.chat({ ...request, onDelta: (d) => seen.push(d.delta) })).resolves.toMatchObject({ text: 'Chào', model: 'm' });
    expect(seen).toEqual(['Chào']);
    expect(env.recorded).toHaveLength(1);
    expect(env.recorded[0]).toMatchObject({ estimated: false });
  });

  it('asks for the whole answer when streaming fails, recording both requests', async () => {
    env.chat = async (i) => {
      if (i.onDelta) throw Object.assign(new Error('stream not supported'), { status: 400 });
      return { text: 'đủ', toolCalls: [] };
    };
    await expect(llm.chat({ ...request, onDelta: () => {} })).resolves.toMatchObject({ text: 'đủ' });
    expect(env.recorded).toHaveLength(2);
  });

  it('does not retry a refused key, and still records the call', async () => {
    let calls = 0;
    env.chat = async () => {
      calls++;
      throw Object.assign(new Error('invalid api key'), { status: 401 });
    };
    await expect(llm.chat({ ...request, onDelta: () => {} })).rejects.toThrow(/API key/);
    expect(calls).toBe(1);
    expect(env.recorded).toHaveLength(1);
  });

  it('keeps what arrived when stopped', async () => {
    const stop = new AbortController();
    env.chat = async (i) => {
      i.onDelta?.({ type: 'reasoning', delta: 'nghĩ' });
      i.onDelta?.({ type: 'text', delta: 'Một nửa' });
      stop.abort();
      throw new Error('aborted');
    };
    await expect(llm.chat({ ...request, onDelta: () => {}, signal: stop.signal })).resolves.toMatchObject({ text: 'Một nửa', reasoning: 'nghĩ', stopped: true, toolCalls: [] });
    expect(env.recorded).toHaveLength(1);
    expect(env.recorded[0]!.usage.outputTokens).toBeGreaterThan(0);
  });
});

describe('an OpenAI-style stream', () => {
  const chunks = async function* (deltas: object[]) {
    for (const delta of deltas) yield { choices: [{ delta }] } as never;
    yield { choices: [], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } } as never;
  };

  it('puts tool calls back together and separates thinking from the answer', async () => {
    const seen: string[] = [];
    const result = await readStream(
      chunks([
        { content: '<thought>cân nhắc', extra_content: { google: { thought: true } } },
        { reasoning_content: ' thêm' },
        { content: '</thought>Để mình ' },
        { content: 'xem' },
        { tool_calls: [{ index: 0, id: 'a', function: { name: 'get_channel', arguments: '{"x":' }, extra_content: { sig: 1 } }] },
        { tool_calls: [{ index: 0, function: { arguments: '1}' } }] },
        { tool_calls: [{ index: 0, id: 'b', function: { name: 'list_skills', arguments: '{}' } }] },
      ]),
      (d) => seen.push(d.type),
    );
    expect(result).toMatchObject({ text: 'Để mình xem', reasoning: 'cân nhắc thêm', usage: { input: 5, output: 3 } });
    expect(result.toolCalls).toEqual([{ id: 'a', name: 'get_channel', args: { x: 1 }, meta: { sig: 1 } }, { id: 'b', name: 'list_skills', args: {} }]);
    expect(seen).toEqual(['reasoning', 'reasoning', 'text', 'text']);
  });

  it('treats a stream with nothing in it as a failure, so the whole answer is asked for', async () => {
    await expect(readStream(chunks([]), () => {})).rejects.toThrow();
  });
});

describe('AG-UI events of a step', () => {
  it('are valid, fold into the live turn, and give way to the stored message', () => {
    const events: AssistantEvent[] = [{ type: 'RUN_STARTED' as never, threadId: 't', runId: 'r' } as never];
    const step = stepStream((e) => events.push(e), 'live1');
    step.delta('reasoning', 'nghĩ');
    step.delta('text', 'Xin ');
    step.delta('text', 'chào');
    step.close();
    for (const e of events) expect(EventSchemas.safeParse(e).success, e.type).toBe(true);
    const turn = events.reduce(applyEvent, EMPTY_TURN);
    expect(turn.items).toEqual([{ kind: 'reasoning', id: 'live1', text: 'nghĩ' }, { kind: 'text', id: 'live1', text: 'Xin chào' }]);
    // Replaying the same run from its start never doubles it.
    expect(events.reduce(applyEvent, turn).items).toEqual(turn.items);
    expect(pendingItems(turn, [{ role: 'assistant', toolCallId: null, data: { liveId: 'live1' } }])).toEqual([]);
  });
});
