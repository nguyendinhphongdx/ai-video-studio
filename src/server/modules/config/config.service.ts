import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FORMATS, VOICES } from '@/core/domain';
import { PUBLIC_DIR } from '@/server/config';
import { googleTtsAvailable, ttsAvailable } from '@/server/adapters/tts/tts.service';
import { jobRepository } from '@/server/modules/job/job.repository';
import { prefsService } from '@/server/modules/prefs/prefs.service';
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
  /** ffmpeg is installed (needed to join clips and mix sound). */
  ffmpeg: boolean;
  /** The background worker has been seen in the last few seconds. */
  worker: { alive: boolean };
  /** Background tracks under public/audio/. */
  musicTracks: string[];
}

/** How long since the worker's last heartbeat still counts as running. */
export const WORKER_ALIVE_MS = 20_000;

let ffmpegCache: { at: number; ok: boolean } | null = null;
async function ffmpegAvailable(): Promise<boolean> {
  if (ffmpegCache && Date.now() - ffmpegCache.at < 60_000) return ffmpegCache.ok;
  const ok = await new Promise<boolean>((resolve) => execFile('ffmpeg', ['-version'], (err) => resolve(!err)));
  ffmpegCache = { at: Date.now(), ok };
  return ok;
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
      ffmpeg: await ffmpegAvailable(),
      worker: { alive: Date.now() - (prefsService.workerSeenAt() ?? 0) < WORKER_ALIVE_MS },
      musicTracks: (await fs.readdir(path.join(PUBLIC_DIR, 'audio')).catch(() => [])).filter((f) => /\.(wav|mp3)$/.test(f)).sort(),
    };
  },
};
