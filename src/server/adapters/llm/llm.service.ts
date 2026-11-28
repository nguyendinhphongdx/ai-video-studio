// Picks the provider adapter from the saved settings on every call (no restart after changing settings).
import type { LlmPort } from '@/core/ports';
import { UserFacingError } from '@/core/domain/errors';
import { isReady, settingsService } from '@/server/modules/settings/settings.service';
import { PROVIDERS, type LlmSettings, type LlmSettingsInput, type LlmTestResult } from '@/server/modules/settings/settings.types';

import { anthropicClient } from './anthropic';
import { estimateTokens } from '@/core/usage/cost';
import { usageService } from '@/server/modules/usage/usage.service';

import type { LlmClient, LlmUsage } from './llm.types';
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

/** Writes the call to the cost ledger; when the provider reported no usage, estimates it from the text and says so. */
async function track(settings: LlmSettings, usage: LlmUsage | undefined, text: { in: string; out: string }, purpose: string | undefined, started: number) {
  const reported = usage ?? { input: estimateTokens(text.in), output: estimateTokens(text.out), cached: 0 };
  await usageService.record({
    kind: 'llm', provider: settings.provider, model: settings.model, purpose, durationMs: Date.now() - started, estimated: !usage,
    usage: { inputTokens: reported.input, outputTokens: reported.output, cachedTokens: reported.cached, units: 0 },
  });
}

export const llm: LlmPort = {
  async isReady() {
    return isReady(await settingsService.llm());
  },
  async chat({ purpose, onDelta, signal, ...input }) {
    const settings = await settingsService.llm();
    if (!isReady(settings)) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key.');
    await usageService.assertWithinBudget();
    // The picture bytes are not text: leave them out of the estimate used when a provider reports no usage.
    const sent = input.system + JSON.stringify(input.messages.map(({ images: _images, ...m }) => m));
    const client = clientFor(settings);
    const partial = { text: '', reasoning: '' };
    const started = Date.now();
    // One provider request. A failed or stopped one may still be billed, so it goes into the ledger too, estimated
    // from what arrived.
    const attempt = async (stream: boolean) => {
      partial.text = partial.reasoning = '';
      try {
        const { usage, ...out } = await client.chat({ ...input, signal, ...(stream && onDelta ? { onDelta: (d) => ((partial[d.type] += d.delta), onDelta(d)) } : {}) });
        await track(settings, usage, { in: sent, out: out.text + JSON.stringify(out.toolCalls) }, purpose, started);
        return { ...out, model: settings.model };
      } catch (e) {
        await track(settings, undefined, { in: sent, out: partial.reasoning + partial.text }, purpose, started);
        throw e;
      }
    };
    const stopped = () => ({ text: partial.text.trim(), toolCalls: [], ...(partial.reasoning ? { reasoning: partial.reasoning.trim() } : {}), stopped: true, model: settings.model });
    try {
      if (!onDelta) return await attempt(false);
      try {
        return await attempt(true);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (signal?.aborted || e instanceof UserFacingError || status === 401 || status === 403 || status === 429) throw e;
        // The server or model cannot stream this request: ask for the whole answer instead.
        return await attempt(false);
      }
    } catch (e) {
      if (signal?.aborted) return stopped();
      if (e instanceof UserFacingError) throw e;
      if (input.messages.some((m) => m.images?.length) && /image|vision|multimodal|modalit/i.test(String((e as Error)?.message ?? e)))
        throw new UserFacingError(`Model "${settings.model}" không đọc được ảnh này. Đổi model ở Cài đặt, hoặc gửi lại không kèm ảnh trong cuộc trò chuyện mới.`, String((e as Error)?.stack ?? e));
      throw new UserFacingError(`AI lỗi: ${describeLlmError(e, settings)}`, String((e as Error)?.stack ?? e));
    }
  },
  async generateObject(input) {
    const settings = await settingsService.llm();
    if (!isReady(settings)) throw new UserFacingError('Chưa cài đặt AI. Mở Cài đặt để chọn nhà cung cấp và nhập API key, hoặc dùng chế độ dán kịch bản.');
    await usageService.assertWithinBudget();
    const started = Date.now();
    try {
      const { object, usage } = await clientFor(settings).generateObject(input);
      await track(settings, usage, { in: input.system + input.user, out: JSON.stringify(object) }, input.purpose, started);
      return { object, model: settings.model };
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
