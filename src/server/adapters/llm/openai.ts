// OpenAI Chat Completions; also Gemini and any OpenAI-compatible server (Ollama, LM Studio, OpenRouter...).
import OpenAI from 'openai';
import { toJSONSchema, type z } from 'zod';

import { UserFacingError } from '@/core/domain/errors';
import type { ChatDelta } from '@/core/ports';
import { extractJson } from '@/core/script/script';
import type { LlmSettings } from '@/server/modules/settings/settings.types';

import { toolSchema, type LlmClient, type LlmUsage } from './llm.types';

/** Strict structured output rejects $schema and the safe-integer bounds zod adds to .int(). */
function strictSchema(schema: z.ZodType): Record<string, unknown> {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$schema') continue;
      if ((k === 'minimum' || k === 'maximum') && typeof v === 'number' && Math.abs(v) >= Number.MAX_SAFE_INTEGER) continue;
      out[k] = walk(v);
    }
    return out;
  };
  return walk(toJSONSchema(schema)) as Record<string, unknown>;
}

const rejectsJsonSchema = (e: unknown) => {
  const err = e as { status?: number; message?: string };
  return (err.status === 400 || err.status === 422) && /response_format|json_schema|schema/i.test(String(err.message));
};

/** OpenAI counts cached tokens inside prompt_tokens; split them out so they are priced separately. */
const usageOf = (u: OpenAI.CompletionUsage | undefined): LlmUsage | undefined => {
  if (!u) return undefined;
  const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
  return { input: Math.max(0, u.prompt_tokens - cached), output: u.completion_tokens, cached };
};

// A model that sends broken JSON gets an empty call; the tool's own validation explains what is missing.
function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Collects a streamed completion. Thinking arrives in different places depending on the server. */
export async function readStream(chunks: AsyncIterable<OpenAI.ChatCompletionChunk>, onDelta: (d: ChatDelta) => void, signal?: AbortSignal) {
  type Delta = OpenAI.ChatCompletionChunk.Choice.Delta & { reasoning_content?: string; reasoning?: string; extra_content?: { google?: { thought?: boolean } } & Record<string, unknown> };
  let text = '';
  let reasoning = '';
  let usage: OpenAI.CompletionUsage | undefined;
  const calls: { id: string; name: string; args: string; meta?: Record<string, unknown> }[] = [];
  const say = (type: ChatDelta['type'], delta: string) => {
    if (!delta) return;
    if (type === 'text') text += delta;
    else reasoning += delta;
    onDelta({ type, delta });
  };
  for await (const chunk of chunks) {
    usage = chunk.usage ?? usage;
    const delta = chunk.choices[0]?.delta as Delta | undefined;
    if (!delta) continue;
    if (delta.refusal) throw new UserFacingError(`AI từ chối yêu cầu: ${delta.refusal}`);
    say('reasoning', delta.reasoning_content ?? delta.reasoning ?? '');
    const content = delta.content ?? '';
    // Gemini marks a thought chunk and may wrap it in <thought> tags.
    if (delta.extra_content?.google?.thought) say('reasoning', content.replace(/<\/?thought>/g, ''));
    else say('text', content.replace(/<thought>[\s\S]*?<\/thought>|<\/thought>/g, ''));
    for (const part of delta.tool_calls ?? []) {
      const extra = (part as { extra_content?: Record<string, unknown> }).extra_content;
      // Some servers repeat the index for each new call; a new id always starts a new call.
      let call = part.id ? calls.find((c) => c.id === part.id) : calls[part.index] ?? calls.at(-1);
      if (!call) calls.push((call = { id: part.id ?? `call_${calls.length}`, name: '', args: '' }));
      call.name ||= part.function?.name ?? '';
      call.args += part.function?.arguments ?? '';
      if (extra) call.meta = extra;
    }
  }
  // The SDK ends an aborted stream quietly.
  if (signal?.aborted) throw new Error('aborted');
  if (!text && !calls.length) throw new Error('empty stream');
  return {
    text: text.trim(),
    toolCalls: calls.map((c) => ({ id: c.id, name: c.name, args: parseArgs(c.args), ...(c.meta ? { meta: c.meta } : {}) })),
    ...(reasoning.trim() ? { reasoning: reasoning.trim() } : {}),
    usage: usageOf(usage),
  };
}

export function openaiClient(llm: LlmSettings): LlmClient {
  const client = new OpenAI({ apiKey: llm.apiKey || 'not-needed', ...(llm.baseUrl ? { baseURL: llm.baseUrl } : {}) });

  const complete = async (messages: OpenAI.ChatCompletionMessageParam[], response_format?: OpenAI.ChatCompletionCreateParams['response_format']) => {
    const r = await client.chat.completions.create({ model: llm.model, messages, ...(response_format ? { response_format } : {}) });
    const choice = r.choices[0];
    if (choice?.message?.refusal) throw new UserFacingError(`AI từ chối yêu cầu: ${choice.message.refusal}`);
    const text = choice?.message?.content;
    if (!text) throw new UserFacingError(`AI không trả về nội dung (finish_reason=${choice?.finish_reason})`);
    return { text, usage: usageOf(r.usage) };
  };

  return {
    async generateObject({ system, user, schema }) {
      const json = strictSchema(schema);
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      try {
        const first = await complete(messages, { type: 'json_schema', json_schema: { name: 'video_script', strict: true, schema: json } });
        return { object: extractJson(first.text), usage: first.usage };
      } catch (e) {
        if (!rejectsJsonSchema(e)) throw e;
      }
      // Servers without structured output: plain JSON mode with the schema in the prompt.
      messages[1] = { role: 'user', content: `${user}\n\nChỉ trả về MỘT object JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(json)}` };
      const second = await complete(messages, { type: 'json_object' });
      return { object: extractJson(second.text), usage: second.usage };
    },
    async chat({ system, messages, tools, onDelta, signal }) {
      const out: OpenAI.ChatCompletionMessageParam[] = [{ role: 'system', content: system }];
      for (const m of messages) {
        if (m.role === 'user')
          out.push({
            role: 'user',
            content: m.images?.length
              ? [{ type: 'text' as const, text: m.content || '(xem ảnh)' }, ...m.images.map((i) => ({ type: 'image_url' as const, image_url: { url: `data:${i.mime};base64,${i.base64}` } }))]
              : m.content,
          });
        else if (m.role === 'assistant')
          out.push({
            role: 'assistant',
            content: m.content || null,
            // Gemini 3 rejects a replayed call without its thought signature, which rides in extra_content.
            ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.args) }, ...(c.meta ? { extra_content: c.meta } : {}) })) as OpenAI.ChatCompletionMessageToolCall[] } : {}),
          });
        else out.push({ role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content });
      }
      const request = {
        model: llm.model,
        messages: out,
        ...(tools.length ? { tools: tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: toolSchema(t.schema, (s) => toJSONSchema(s) as Record<string, unknown>) } })) } : {}),
      };
      if (onDelta) {
        // Gemini returns thought summaries only when asked, in the field its OpenAI endpoint reads.
        const thinking = llm.provider === 'gemini' ? { reasoning_effort: llm.effort, extra_body: { google: { thinking_config: { include_thoughts: true } } } } : {};
        const chunks = await client.chat.completions.create({ ...request, ...thinking, stream: true, stream_options: { include_usage: true } }, { signal });
        return await readStream(chunks, onDelta, signal);
      }
      const r = await client.chat.completions.create(request, { signal });
      const choice = r.choices[0];
      if (choice?.message?.refusal) throw new UserFacingError(`AI từ chối yêu cầu: ${choice.message.refusal}`);
      const toolCalls = (choice?.message?.tool_calls ?? []).flatMap((c) => {
        if (c.type !== 'function') return [];
        const args = parseArgs(c.function.arguments);
        const extra = (c as unknown as { extra_content?: Record<string, unknown> }).extra_content;
        return [{ id: c.id, name: c.function.name, args, ...(extra ? { meta: extra } : {}) }];
      });
      return { text: (choice?.message?.content ?? '').trim(), toolCalls, usage: usageOf(r.usage) };
    },
    async ping() {
      const r = await client.chat.completions.create({ model: llm.model, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
      return r.model || llm.model;
    },
  };
}
