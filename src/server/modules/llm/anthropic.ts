import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

import { UserFacingError } from '@/core/domain';
import type { LlmSettings } from '@/server/modules/settings/settings.types';

import type { LlmClient } from './llm.types';

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
    async ping() {
      const r = await client.messages.create({ model: llm.model, max_tokens: 16, messages: [{ role: 'user', content: 'Trả lời đúng một chữ: OK' }] });
      return r.model;
    },
  };
}
