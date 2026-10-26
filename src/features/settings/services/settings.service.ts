import { api } from '@/lib/api/client';
import type { LlmSettingsInput, LlmTestResult, PublicLlmSettings } from '@/server/modules/settings/settings.types';

export const settingsApi = {
  llm: () => api<PublicLlmSettings>('/settings/llm'),
  saveLlm: (input: LlmSettingsInput) => api<PublicLlmSettings>('/settings/llm', { method: 'PUT', body: input }),
  testLlm: (input: LlmSettingsInput) => api<LlmTestResult>('/settings/llm/test', { body: input }),
  previewVoice: (text: string, voice: string) => api<{ url: string }>('/tts/preview', { body: { text, voice } }),
};
