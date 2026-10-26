import fs from 'node:fs/promises';
import path from 'node:path';

import { FORMATS, VOICES } from '@/core/domain';
import { PUBLIC_DIR } from '@/server/config';
import { googleTtsAvailable, ttsAvailable } from '@/server/adapters/tts/tts.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { settingsService } from '@/server/modules/settings/settings.service';
import { IMAGE_PROVIDERS, PROVIDERS } from '@/server/modules/settings/settings.types';

export interface AppConfig {
  formats: typeof FORMATS;
  voices: typeof VOICES;
  /** Edge TTS (the edge-tts CLI) is installed. */
  tts: boolean;
  /** A Google API key is available for the Google voices. */
  ttsGoogle: boolean;
  llm: { ready: boolean; provider: string; providerLabel: string; model: string };
  image: { ready: boolean; providerLabel: string };
  activeJobs: number;
  /** Background tracks under public/audio/. */
  musicTracks: string[];
}

export const configService = {
  async get(): Promise<AppConfig> {
    const llm = await settingsService.publicLlm();
    const image = await settingsService.publicImage();
    return {
      formats: FORMATS,
      voices: VOICES,
      tts: await ttsAvailable(),
      ttsGoogle: await googleTtsAvailable(),
      llm: { ready: llm.ready, provider: llm.provider, providerLabel: PROVIDERS[llm.provider].short, model: llm.model },
      image: { ready: image.ready, providerLabel: IMAGE_PROVIDERS[image.provider].label },
      activeJobs: jobRepository.listActive().length,
      musicTracks: (await fs.readdir(path.join(PUBLIC_DIR, 'audio')).catch(() => [])).filter((f) => /\.(wav|mp3)$/.test(f)).sort(),
    };
  },
};
