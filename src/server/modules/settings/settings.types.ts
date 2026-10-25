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
