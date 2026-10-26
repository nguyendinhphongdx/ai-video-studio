// OpenAI Chat Completions; also Gemini and any OpenAI-compatible server (Ollama, LM Studio, OpenRouter...).
import OpenAI from 'openai';
import { toJSONSchema, type z } from 'zod';

import { UserFacingError } from '@/core/domain/errors';
import { extractJson } from '@/core/script/script';
import type { LlmSettings } from '@/server/modules/settings/settings.types';

import { toolSchema, type LlmClient } from './llm.types';

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

export function openaiClient(llm: LlmSettings): LlmClient {
  const client = new OpenAI({ apiKey: llm.apiKey || 'not-needed', ...(llm.baseUrl ? { baseURL: llm.baseUrl } : {}) });

  const complete = async (messages: OpenAI.ChatCompletionMessageParam[], response_format?: OpenAI.ChatCompletionCreateParams['response_format']) => {
    const r = await client.chat.completions.create({ model: llm.model, messages, ...(response_format ? { response_format } : {}) });
    const choice = r.choices[0];
    if (choice?.message?.refusal) throw new UserFacingError(`AI từ chối yêu cầu: ${choice.message.refusal}`);
    const text = choice?.message?.content;
    if (!text) throw new UserFacingError(`AI không trả về nội dung (finish_reason=${choice?.finish_reason})`);
    return text;
  };

  return {
    async generateObject({ system, user, schema }) {
      const json = strictSchema(schema);
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      try {
        return extractJson(await complete(messages, { type: 'json_schema', json_schema: { name: 'video_script', strict: true, schema: json } }));
      } catch (e) {
        if (!rejectsJsonSchema(e)) throw e;
      }
      // Servers without structured output: plain JSON mode with the schema in the prompt.
      messages[1] = { role: 'user', content: `${user}\n\nChỉ trả về MỘT object JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(json)}` };
      return extractJson(await complete(messages, { type: 'json_object' }));
    },
    async chat({ system, messages, tools }) {
      const out: OpenAI.ChatCompletionMessageParam[] = [{ role: 'system', content: system }];
      for (const m of messages) {
        if (m.role === 'user') out.push({ role: 'user', content: m.content });
        else if (m.role === 'assistant')
          out.push({
            role: 'assistant',
            content: m.content || null,
            // Gemini 3 rejects a replayed call without its thought signature, which rides in extra_content.
            ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.args) }, ...(c.meta ? { extra_content: c.meta } : {}) })) as OpenAI.ChatCompletionMessageToolCall[] } : {}),
          });
        else out.push({ role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content });
      }
      const r = await client.chat.completions.create({
        model: llm.model,
        messages: out,
        ...(tools.length ? { tools: tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: toolSchema(t.schema, (s) => toJSONSchema(s) as Record<string, unknown>) } })) } : {}),
      });
      const choice = r.choices[0];
      if (choice?.message?.refusal) throw new UserFacingError(`AI từ chối yêu cầu: ${choice.message.refusal}`);
      const toolCalls = (choice?.message?.tool_calls ?? []).flatMap((c) => {
        if (c.type !== 'function') return [];
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(c.function.arguments || '{}') as Record<string, unknown>;
        } catch {
          // A model that sends broken JSON gets an empty call; the tool's own validation explains what is missing.
        }
        const extra = (c as unknown as { extra_content?: Record<string, unknown> }).extra_content;
        return [{ id: c.id, name: c.function.name, args, ...(extra ? { meta: extra } : {}) }];
      });
      return { text: (choice?.message?.content ?? '').trim(), toolCalls };
    },
    async ping() {
      const r = await client.chat.completions.create({ model: llm.model, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
      return r.model || llm.model;
    },
  };
}
