import { FORMATS, VOICES } from '@/core/domain';
import { ttsAvailable } from '@/server/adapters/tts/tts.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { settingsService } from '@/server/modules/settings/settings.service';
import { PROVIDERS } from '@/server/modules/settings/settings.types';

export interface AppConfig {
  formats: typeof FORMATS;
  voices: typeof VOICES;
  tts: boolean;
  llm: { ready: boolean; provider: string; providerLabel: string; model: string };
  activeJobs: number;
}

export const configService = {
  async get(): Promise<AppConfig> {
    const llm = await settingsService.publicLlm();
    return {
      formats: FORMATS,
      voices: VOICES,
      tts: await ttsAvailable(),
      llm: { ready: llm.ready, provider: llm.provider, providerLabel: PROVIDERS[llm.provider].short, model: llm.model },
      activeJobs: jobRepository.listActive().length,
    };
  },
};
