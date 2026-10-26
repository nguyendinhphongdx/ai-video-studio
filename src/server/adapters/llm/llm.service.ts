// Picks the provider adapter from the saved settings on every call (no restart after changing settings).
import type { LlmPort } from '@/core/ports';
import { UserFacingError } from '@/core/domain/errors';
import { isReady, settingsService } from '@/server/modules/settings/settings.service';
import { PROVIDERS, type LlmSettings, type LlmSettingsInput, type LlmTestResult } from '@/server/modules/settings/settings.types';

import { anthropicClient } from './anthropic';
import type { LlmClient } from './llm.types';
import { openaiClient } from './openai';

export function clientFor(llm: LlmSettings): LlmClient {
  switch (llm.provider) {
    case 'anthropic':
      return anthropicClient(llm);
    case 'gemini':
      return openaiClient({ ...llm, baseUrl: llm.baseUrl || PROVIDERS.gemini.baseUrl });
    case 'openai':
    case 'openai-compatible':
      return openaiClient(llm);
  }
}

/** Short, readable reason a connection test or call failed. */
export function describeLlmError(e: unknown, llm: LlmSettings): string {
  const msg = String((e as Error)?.message ?? e);
  if (/connection error|ECONNREFUSED|fetch failed/i.test(msg)) {
    return `Không kết nối được tới ${llm.baseUrl || PROVIDERS[llm.provider].label}. Kiểm tra máy chủ đã chạy và Base URL đúng chưa.`;
  }
  if (/401|invalid.*key|authentication/i.test(msg)) return `API key không hợp lệ cho ${PROVIDERS[llm.provider].label}.`;
  if (/404|model.*not.*found|does not exist/i.test(msg)) return `Không tìm thấy model "${llm.model}".`;
  if (/429|rate limit|quota/i.test(msg)) return 'Nhà cung cấp AI đang giới hạn lượt gọi hoặc hết hạn mức. Thử lại sau.';
  return msg.split('\n')[0]!.slice(0, 300);
}

export const llm: LlmPort = {
  async isReady() {
    return isReady(await settingsService.llm());
  },
  async chat(input) {
    const settings = await settingsService.llm();
    if (!isReady(settings)) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key.');
    try {
      return { ...(await clientFor(settings).chat(input)), model: settings.model };
    } catch (e) {
      if (e instanceof UserFacingError) throw e;
      throw new UserFacingError(`AI lỗi: ${describeLlmError(e, settings)}`, String((e as Error)?.stack ?? e));
    }
  },
  async generateObject(input) {
    const settings = await settingsService.llm();
    if (!isReady(settings)) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key, hoặc dùng chế độ dán kịch bản.');
    try {
      return { object: await clientFor(settings).generateObject(input), model: settings.model };
    } catch (e) {
      if (e instanceof UserFacingError) throw e;
      throw new UserFacingError(`AI lỗi: ${describeLlmError(e, settings)}`, String((e as Error)?.stack ?? e));
    }
  },
};

export const llmService = {
  /** One tiny request with the form's values (saved values fill the gaps). */
  async test(input: LlmSettingsInput): Promise<LlmTestResult> {
    const settings = await settingsService.previewLlm(input);
    if (!isReady(settings)) {
      const why = !settings.model ? 'Chưa nhập model.' : settings.provider === 'openai-compatible' && !settings.baseUrl ? 'Chưa nhập Base URL.' : `Chưa có API key cho ${PROVIDERS[settings.provider].label}.`;
      return { ok: false, error: why };
    }
    try {
      return { ok: true, model: await clientFor(settings).ping() };
    } catch (e) {
      return { ok: false, error: describeLlmError(e, settings) };
    }
  },
};
