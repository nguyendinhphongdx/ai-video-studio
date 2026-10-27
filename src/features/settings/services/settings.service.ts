import { api } from '@/lib/api/client';
import type { ImageSettingsInput, LlmSettingsInput, LlmTestResult, PublicImageSettings, PublicLlmSettings } from '@/server/modules/settings/settings.types';

export const settingsApi = {
  llm: () => api<PublicLlmSettings>('/settings/llm'),
  saveLlm: (input: LlmSettingsInput) => api<PublicLlmSettings>('/settings/llm', { method: 'PUT', body: input }),
  testLlm: (input: LlmSettingsInput) => api<LlmTestResult>('/settings/llm/test', { body: input }),
  image: () => api<PublicImageSettings>('/settings/image'),
  testImage: (input: ImageSettingsInput) => api<{ ok: true; model: string; bytes: number } | { ok: false; error: string }>('/settings/image/test', { body: input }),
  saveImage: (input: ImageSettingsInput) => api<PublicImageSettings>('/settings/image', { method: 'PUT', body: input }),
  sfx: () => api<{ enabled: boolean; volume: number }>('/settings/sfx'),
  saveSfx: (input: { enabled?: boolean; volume?: number }) => api<{ enabled: boolean; volume: number }>('/settings/sfx', { method: 'PUT', body: input }),
  previewVoice: (text: string, voice: string) => api<{ url: string }>('/tts/preview', { body: { text, voice } }),
};
