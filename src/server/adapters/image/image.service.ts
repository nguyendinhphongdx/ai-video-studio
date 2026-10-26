// Picture generation for blocks that need one (@remotion/vox). The provider comes from the saved settings on every call.
import fs from 'node:fs/promises';
import path from 'node:path';

import OpenAI from 'openai';

import { UserFacingError } from '@/core/domain/errors';
import type { ImagePort } from '@/core/ports';
import { createLogger } from '@/server/logger';
import { settingsService } from '@/server/modules/settings/settings.service';
import { IMAGE_PROVIDERS, type ImageSettings, type ImageSettingsInput } from '@/server/modules/settings/settings.types';

const logger = createLogger('image');
const RETRY_DELAYS_MS = [3000, 8000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gemini(s: ImageSettings, prompt: string): Promise<Buffer> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': s.apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } } }),
  });
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: { finishReason?: string; content?: { parts?: { inlineData?: { data?: string }; inline_data?: { data?: string } }[] } }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? `HTTP ${res.status}`), { status: res.status });
  const part = body?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data);
  const data = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!data) throw new UserFacingError(`AI không trả về ảnh (${body?.promptFeedback?.blockReason ?? body?.candidates?.[0]?.finishReason ?? 'không rõ lý do'}). Thử đổi mô tả ảnh của cảnh.`);
  return Buffer.from(data, 'base64');
}

async function openai(s: ImageSettings, prompt: string): Promise<Buffer> {
  const client = new OpenAI({ apiKey: s.apiKey });
  const r = await client.images.generate({ model: s.model, prompt, size: '1536x1024' });
  const b64 = r.data?.[0]?.b64_json;
  if (!b64) throw new UserFacingError('AI không trả về ảnh. Thử đổi mô tả ảnh của cảnh.');
  return Buffer.from(b64, 'base64');
}

function describe(e: unknown, s: ImageSettings): string {
  const msg = String((e as Error)?.message ?? e);
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 403 || /api key|permission/i.test(msg)) return `API key không hợp lệ hoặc chưa được bật tạo ảnh cho ${IMAGE_PROVIDERS[s.provider].label}.`;
  if (status === 404) return `Không tìm thấy model ảnh "${s.model}".`;
  if (status === 429 || /quota|rate/i.test(msg)) return 'Nhà cung cấp ảnh đang giới hạn lượt gọi hoặc hết hạn mức. Bấm Thử lại sau.';
  if (/safety|blocked|policy/i.test(msg)) return 'Ảnh bị bộ lọc an toàn chặn. Đổi mô tả ảnh của cảnh rồi thử lại.';
  return msg.split('\n')[0]!.slice(0, 300);
}

/** One real image request with the form's values (saved values fill the gaps). Costs one picture. */
export async function testImage(input: ImageSettingsInput): Promise<{ ok: true; model: string; bytes: number } | { ok: false; error: string }> {
  const s = await settingsService.previewImage(input);
  if (!s.apiKey) return { ok: false, error: `Chưa có API key cho ${IMAGE_PROVIDERS[s.provider].label}.` };
  try {
    const png = s.provider === 'gemini' ? await gemini(s, 'A simple red apple on a white table, studio photo, no text') : await openai(s, 'A simple red apple on a white table, studio photo, no text');
    return { ok: true, model: s.model, bytes: png.length };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : describe(e, s) };
  }
}

export const images: ImagePort = {
  async isReady() {
    const s = await settingsService.image();
    return Boolean(s.apiKey && s.model);
  },
  async generate(prompt, outFile) {
    const s = await settingsService.image();
    if (!s.apiKey) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, chọn nhà cung cấp ảnh và nhập API key.');
    for (let attempt = 0; ; attempt++) {
      try {
        const png = s.provider === 'gemini' ? await gemini(s, prompt) : await openai(s, prompt);
        await fs.mkdir(path.dirname(outFile), { recursive: true });
        await fs.writeFile(outFile, png);
        return;
      } catch (e) {
        const status = (e as { status?: number })?.status;
        const retryable = !(e instanceof UserFacingError) && (status === undefined || status === 429 || status >= 500);
        if (retryable && attempt < RETRY_DELAYS_MS.length) {
          logger.warn('image retry', { attempt: attempt + 1, error: String((e as Error)?.message ?? e) });
          await sleep(RETRY_DELAYS_MS[attempt]!);
          continue;
        }
        if (e instanceof UserFacingError) throw e;
        throw new UserFacingError(`Tạo ảnh lỗi: ${describe(e, s)}`, String((e as Error)?.stack ?? e));
      }
    }
  },
};
