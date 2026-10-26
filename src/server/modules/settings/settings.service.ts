// LLM settings chosen in the UI, saved to data/settings.json (gitignored, 0600, atomic write).
// Saved values win; env vars are only a fallback when a value is empty.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ApiError } from '@/server/http/api-error';
import { SETTINGS_FILE } from '@/server/config';

import {
  EFFORTS,
  IMAGE_PROVIDERS,
  PROVIDERS,
  type ImageProviderId,
  type ImageSettings,
  type ImageSettingsInput,
  type LlmSettings,
  type LlmSettingsInput,
  type ProviderId,
  type PublicImageSettings,
  type PublicLlmSettings,
} from './settings.types';

type Saved = Partial<LlmSettings>;

type SavedImage = Partial<ImageSettings>;

async function readAll(): Promise<{ llm?: Saved; image?: SavedImage }> {
  try {
    return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeAll(data: object) {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  const tmp = `${SETTINGS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await fs.rename(tmp, SETTINGS_FILE);
}

function resolve(saved: Saved = {}): LlmSettings {
  const provider: ProviderId = saved.provider && saved.provider in PROVIDERS ? saved.provider : 'anthropic';
  const p = PROVIDERS[provider];
  const envModel = provider === 'anthropic' ? process.env.AVS_MODEL : undefined;
  return {
    provider,
    model: saved.model || envModel || p.defaultModel,
    apiKey: saved.apiKey || (p.envKey ? process.env[p.envKey] : '') || '',
    baseUrl: saved.baseUrl || p.baseUrl,
    effort: saved.effort && EFFORTS.includes(saved.effort) ? saved.effort : 'medium',
  };
}

/** Image key: its own setting, else the env var, else the AI key when the writing provider is the same company. */
function resolveImage(saved: SavedImage = {}, llm: LlmSettings): ImageSettings & { source: PublicImageSettings['keySource'] } {
  const provider: ImageProviderId = saved.provider && saved.provider in IMAGE_PROVIDERS ? saved.provider : 'gemini';
  const p = IMAGE_PROVIDERS[provider];
  const fromEnv = process.env[p.envKey] ?? '';
  const fromLlm = llm.provider === p.llmProvider ? llm.apiKey : '';
  const apiKey = saved.apiKey || fromEnv || fromLlm;
  return { provider, model: saved.model || p.defaultModel, apiKey, source: saved.apiKey ? 'settings' : fromEnv ? 'env' : fromLlm ? 'llm' : null };
}

export function mergeImage(saved: SavedImage = {}, input: ImageSettingsInput = {}): SavedImage {
  const next: SavedImage = { ...saved };
  if (input.provider !== undefined) {
    if (saved.provider && saved.provider !== input.provider) {
      delete next.apiKey;
      delete next.model;
    }
    next.provider = input.provider;
  }
  if (input.model !== undefined) next.model = input.model.trim();
  const key = input.apiKey?.trim() ?? '';
  if (input.clearKey) delete next.apiKey;
  else if (key && !key.includes('…')) next.apiKey = key;
  return next;
}

export function isReady(llm: LlmSettings): boolean {
  if (!llm.model) return false;
  if (llm.provider === 'openai-compatible' && !llm.baseUrl) return false;
  return !PROVIDERS[llm.provider].needsKey || Boolean(llm.apiKey);
}

export const maskKey = (key: string) => (!key ? '' : key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : `…${key.slice(-2)}`);

/** An empty or masked key keeps the saved one; switching provider drops provider-specific values. */
export function mergeLlm(saved: Saved = {}, input: LlmSettingsInput = {}): Saved {
  const next: Saved = { ...saved };
  if (input.provider !== undefined) {
    if (!(input.provider in PROVIDERS)) throw new ApiError(400, 'validation_error', `Nhà cung cấp không hợp lệ: ${input.provider}`);
    if (saved.provider && saved.provider !== input.provider) {
      delete next.apiKey;
      delete next.model;
      delete next.baseUrl;
    }
    next.provider = input.provider;
  }
  if (input.model !== undefined) next.model = input.model.trim();
  if (input.baseUrl !== undefined) next.baseUrl = input.baseUrl.trim();
  if (input.effort !== undefined) next.effort = input.effort;
  const key = input.apiKey?.trim() ?? '';
  if (input.clearKey) delete next.apiKey;
  else if (key && !key.includes('…')) next.apiKey = key;
  return next;
}

export const settingsService = {
  /** Google API key for Gemini TTS: the one saved for image generation, else GEMINI_API_KEY, else the key of a Gemini writing model. */
  async googleKey(): Promise<string> {
    const all = await readAll();
    const saved = !all.image?.provider || all.image.provider === 'gemini' ? all.image?.apiKey : '';
    const llm = resolve(all.llm);
    return saved || process.env.GEMINI_API_KEY || (llm.provider === 'gemini' ? llm.apiKey : '') || '';
  },

  async image(): Promise<ImageSettings> {
    const all = await readAll();
    const { source: _source, ...settings } = resolveImage(all.image, resolve(all.llm));
    return settings;
  },

  async publicImage(): Promise<PublicImageSettings> {
    const all = await readAll();
    const { source, ...img } = resolveImage(all.image, resolve(all.llm));
    return { ...img, apiKey: maskKey(img.apiKey), hasKey: Boolean(img.apiKey), keySource: source, ready: Boolean(img.apiKey && img.model) };
  },

  /** Settings as they would be after saving `input`, without saving (for the test button). */
  async previewImage(input: ImageSettingsInput): Promise<ImageSettings> {
    const all = await readAll();
    const { source: _source, ...settings } = resolveImage(mergeImage(all.image, input), resolve(all.llm));
    return settings;
  },

  async saveImage(input: ImageSettingsInput): Promise<PublicImageSettings> {
    const all = await readAll();
    await writeAll({ ...all, image: mergeImage(all.image, input) });
    return settingsService.publicImage();
  },

  /** Read fresh on every call so a save applies without restarting the app or the worker. */
  async llm(): Promise<LlmSettings> {
    return resolve((await readAll()).llm);
  },

  async publicLlm(): Promise<PublicLlmSettings> {
    const saved = (await readAll()).llm ?? {};
    const llm = resolve(saved);
    return {
      ...llm,
      apiKey: maskKey(llm.apiKey),
      hasKey: Boolean(llm.apiKey),
      keySource: saved.apiKey ? 'settings' : llm.apiKey ? 'env' : null,
      ready: isReady(llm),
    };
  },

  async saveLlm(input: LlmSettingsInput): Promise<PublicLlmSettings> {
    const all = await readAll();
    await writeAll({ ...all, llm: mergeLlm(all.llm, input) });
    return settingsService.publicLlm();
  },

  /** Settings as they would be after saving `input`, without saving (for "Kiểm tra kết nối"). */
  async previewLlm(input: LlmSettingsInput): Promise<LlmSettings> {
    return resolve(mergeLlm((await readAll()).llm, input));
  },
};
