import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { toJSONSchema, type z } from 'zod';

import { UserFacingError } from '@/core/domain/errors';
import type { LlmSettings } from '@/server/modules/settings/settings.types';

import { toolSchema, type LlmClient } from './llm.types';

export function anthropicClient(llm: LlmSettings): LlmClient {
  const client = new Anthropic({ apiKey: llm.apiKey, ...(llm.baseUrl ? { baseURL: llm.baseUrl } : {}) });
  return {
    async generateObject({ system, user, schema }: { system: string; user: string; schema: z.ZodType }) {
      const response = await client.messages.parse({
        model: llm.model,
        max_tokens: 16000,
        system,
        output_config: { effort: llm.effort, format: zodOutputFormat(schema) },
        messages: [{ role: 'user', content: user }],
      });
      if (response.stop_reason === 'refusal') {
        throw new UserFacingError(`AI từ chối yêu cầu: ${response.stop_details?.explanation ?? 'không rõ lý do'}`);
      }
      if (!response.parsed_output) throw new UserFacingError(`AI không trả về kịch bản hợp lệ (stop_reason=${response.stop_reason})`);
      return response.parsed_output;
    },
    async chat({ system, messages, tools }) {
      const out: Anthropic.MessageParam[] = [];
      for (const m of messages) {
        if (m.role === 'user') out.push({ role: 'user', content: m.content });
        else if (m.role === 'assistant') {
          const blocks: Anthropic.ContentBlockParam[] = [];
          if (m.content.trim()) blocks.push({ type: 'text', text: m.content });
          for (const c of m.toolCalls ?? []) blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args });
          out.push({ role: 'assistant', content: blocks.length ? blocks : [{ type: 'text', text: '…' }] });
        } else {
          const block: Anthropic.ToolResultBlockParam = { type: 'tool_result', tool_use_id: m.toolCallId ?? '', content: m.content, ...(m.isError ? { is_error: true } : {}) };
          const last = out[out.length - 1];
          // Results of one assistant turn travel together in a single user message.
          if (last && last.role === 'user' && Array.isArray(last.content) && last.content.every((b) => b.type === 'tool_result')) last.content.push(block);
          else out.push({ role: 'user', content: [block] });
        }
      }
      const response = await client.messages.create({
        model: llm.model,
        max_tokens: 8000,
        system,
        tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: toolSchema(t.schema, (s) => toJSONSchema(s) as Record<string, unknown>) as Anthropic.Tool.InputSchema })),
        messages: out,
      });
      if (response.stop_reason === 'refusal') throw new UserFacingError('AI từ chối yêu cầu này.');
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
      const toolCalls = response.content.flatMap((b) => (b.type === 'tool_use' ? [{ id: b.id, name: b.name, args: (b.input ?? {}) as Record<string, unknown> }] : []));
      return { text, toolCalls };
    },
    async ping() {
      const r = await client.messages.create({ model: llm.model, max_tokens: 16, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
      return r.model;
    },
  };
}
