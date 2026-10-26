import { z } from 'zod';

// Isomorphic: the settings page imports these to build its form.
export const PROVIDERS = {
  anthropic: {
    label: 'Claude (Anthropic)',
    short: 'Claude',
    needsKey: true,
    defaultModel: 'claude-opus-5-5',
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: '',
    keyUrl: 'https://console.anthropic.com',
  },
  openai: { label: 'OpenAI', short: 'OpenAI', needsKey: true, defaultModel: 'gpt-5', models: ['gpt-5', 'gpt-5-mini'], envKey: 'OPENAI_API_KEY', baseUrl: '', keyUrl: 'https://platform.openai.com/api-keys' },
  gemini: {
    label: 'Google Gemini',
    short: 'Gemini',
    needsKey: true,
    defaultModel: 'gemini-2.5-pro',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  'openai-compatible': {
    label: 'OpenAI-compatible (Ollama, LM Studio, OpenRouter...)',
    short: 'OpenAI-compatible',
    needsKey: false,
    defaultModel: '',
    models: ['llama3.1', 'qwen2.5', 'gemma3'],
    envKey: '',
    baseUrl: 'http://localhost:11434/v1',
    keyUrl: '',
  },
} as const;
export type ProviderId = keyof typeof PROVIDERS;
export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export const EFFORTS = ['low', 'medium', 'high'] as const;
export type Effort = (typeof EFFORTS)[number];

/** Effective settings, secret included. Server only. */
export interface LlmSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  effort: Effort;
}

/** What the browser may see. */
export interface PublicLlmSettings extends Omit<LlmSettings, 'apiKey'> {
  apiKey: string;
  hasKey: boolean;
  keySource: 'settings' | 'env' | null;
  ready: boolean;
}

export interface LlmSettingsInput {
  provider?: ProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  effort?: Effort;
  clearKey?: boolean;
}

export const LlmSettingsInputSchema = z.object({
  provider: z.enum(PROVIDER_IDS as [ProviderId, ...ProviderId[]]).optional(),
  model: z.string().max(200).optional(),
  apiKey: z.string().max(500).optional(),
  baseUrl: z.string().max(500).optional(),
  effort: z.enum(EFFORTS).optional(),
  clearKey: z.boolean().optional(),
}) satisfies z.ZodType<LlmSettingsInput>;

export type LlmTestResult = { ok: true; model: string } | { ok: false; error: string };

// ---- image generation (Vox-style scenes) -------------------------------------------------------
export const IMAGE_PROVIDERS = {
  gemini: { label: 'Google Gemini (Nano Banana, dùng Google API key)', defaultModel: 'gemini-2.5-flash-image', models: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'], envKey: 'GEMINI_API_KEY', keyUrl: 'https://aistudio.google.com/apikey', llmProvider: 'gemini' },
  openai: { label: 'OpenAI (gpt-image)', defaultModel: 'gpt-image-1', models: ['gpt-image-1'], envKey: 'OPENAI_API_KEY', keyUrl: 'https://platform.openai.com/api-keys', llmProvider: 'openai' },
} as const;
export type ImageProviderId = keyof typeof IMAGE_PROVIDERS;
export const IMAGE_PROVIDER_IDS = Object.keys(IMAGE_PROVIDERS) as ImageProviderId[];

/** Effective image settings, secret included. Server only. */
export interface ImageSettings {
  provider: ImageProviderId;
  model: string;
  apiKey: string;
}

export interface PublicImageSettings extends Omit<ImageSettings, 'apiKey'> {
  apiKey: string;
  hasKey: boolean;
  keySource: 'settings' | 'env' | 'llm' | null;
  ready: boolean;
}

export interface ImageSettingsInput {
  provider?: ImageProviderId;
  model?: string;
  apiKey?: string;
  clearKey?: boolean;
}

export const ImageSettingsInputSchema = z.object({
  provider: z.enum(IMAGE_PROVIDER_IDS as [ImageProviderId, ...ImageProviderId[]]).optional(),
  model: z.string().max(200).optional(),
  apiKey: z.string().max(500).optional(),
  clearKey: z.boolean().optional(),
}) satisfies z.ZodType<ImageSettingsInput>;
