// Vietnamese voice-over with Microsoft Edge TTS (free, no key) through the `edge-tts` CLI (pip install edge-tts).
// The service throttles bursts (answering NoAudioReceived for any text), so lines are spaced out and retried.
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { VOICES, type VoiceId } from '@/core/domain/catalog';
import { UserFacingError } from '@/core/domain/errors';
import type { TtsPort } from '@/core/ports';
import { MEDIA_DIR } from '@/server/config';
import { createLogger } from '@/server/logger';
import { probeDuration } from '@/server/adapters/video/video.service';

const run = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const logger = createLogger('tts');

const RATE = '-8%';
const GAP_MS = 600;
const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];
const bin = () => process.env.AVS_EDGE_TTS || 'edge-tts';

let lastCall = 0;

export async function ttsAvailable(): Promise<boolean> {
  if (process.env.AVS_TTS === 'none') return false;
  try {
    await run(bin(), ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function speak(text: string, voice: VoiceId, outFile: string): Promise<void> {
  if (!VOICES[voice]) throw new UserFacingError('Giọng đọc không hợp lệ');
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  for (let attempt = 1; ; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      await run(bin(), ['--voice', voice, `--rate=${RATE}`, '--text', text, '--write-media', outFile]);
      return;
    } catch (e) {
      const err = e as Error & { stderr?: string };
      const detail = `${err.message}\n${err.stderr ?? ''}`.trim();
      const delay = RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined) {
        const why = /NoAudioReceived/.test(detail) ? 'Edge TTS không trả âm thanh' : /ENOENT/.test(detail) ? 'chưa cài edge-tts' : 'Edge TTS bị lỗi';
        throw new UserFacingError(`Không tạo được giọng đọc: ${why}. Thử lại hoặc đổi giọng.`, detail);
      }
      logger.warn(`attempt ${attempt} failed, retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
}

export const tts: TtsPort = {
  async synthesize(text, voice, outFile) {
    await speak(text, voice, outFile);
    return probeDuration(outFile);
  },
};

/** One line spoken for the storyboard's ▶ button, cached by content. Returns a media-relative path. */
export async function previewLine(text: string, voice: VoiceId): Promise<string> {
  const hash = crypto.createHash('sha1').update(`${voice}|${RATE}|${text}`).digest('hex').slice(0, 16);
  const rel = path.join('tts-preview', `${hash}.mp3`);
  const abs = path.join(MEDIA_DIR, rel);
  try {
    await fs.access(abs);
  } catch {
    await speak(text, voice, abs);
  }
  return rel;
}
