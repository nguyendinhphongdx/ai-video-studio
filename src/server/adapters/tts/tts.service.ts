// Vietnamese voice-over with Microsoft Edge TTS (free, no key) through the `edge-tts` CLI (pip install edge-tts).
// The service throttles bursts (answering NoAudioReceived for any text), so lines are spaced out and retried.
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { VOICES, googleVoiceName, isGoogleVoice, type VoiceId } from '@/core/domain/catalog';
import { UserFacingError } from '@/core/domain/errors';
import type { TtsPort } from '@/core/ports';
import { MEDIA_DIR } from '@/server/config';
import { createLogger } from '@/server/logger';
import { probeDuration } from '@/server/adapters/video/video.service';
import { settingsService } from '@/server/modules/settings/settings.service';

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

const GEMINI_TTS_MODEL = () => process.env.AVS_GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
/** Gemini TTS follows plain-language direction. Without it every line comes out flat, like a reading of a list. */
const GOOGLE_DIRECTION = 'Say the following Vietnamese narration like a skilled human storyteller: warm, engaged and conversational, with natural rises and falls in pitch, short pauses at commas and between sentences, extra emphasis on the key word or number, and a pace that speeds up slightly in exciting moments and slows down for important ones. Never flat or robotic:';
const DIRECTION_VERSION = 'd2';
const GOOGLE_RETRY_DELAYS_MS = [3000, 8000, 20000];

export async function googleTtsAvailable(): Promise<boolean> {
  return Boolean(await settingsService.googleKey());
}

/** Whether this voice can be spoken right now (Edge needs the edge-tts CLI, Google needs a key). */
export async function voiceAvailable(voice: string): Promise<boolean> {
  return isGoogleVoice(voice) ? googleTtsAvailable() : ttsAvailable();
}

/** Gemini TTS answers with raw 16-bit PCM; ffmpeg turns it into the mp3 the rest of the pipeline expects. */
async function speakGoogle(text: string, voice: VoiceId, outFile: string): Promise<void> {
  const key = await settingsService.googleKey();
  if (!key) throw new UserFacingError('Chưa có Google API key cho giọng Google. Nhập key ở Cài đặt (mục Tạo ảnh AI) hoặc chọn giọng Edge.');
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_TTS_MODEL())}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${GOOGLE_DIRECTION}\n\n${text}` }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: googleVoiceName(voice) } } } },
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string }; candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] } | null;
      if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? `HTTP ${res.status}`), { status: res.status });
      const part = body?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!part?.data) throw Object.assign(new Error('Google không trả âm thanh'), { status: 502 });
      const rate = /rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? '24000';
      const pcm = `${outFile}.pcm`;
      await fs.writeFile(pcm, Buffer.from(part.data, 'base64'));
      try {
        await run('ffmpeg', ['-y', '-v', 'error', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', pcm, '-codec:a', 'libmp3lame', '-q:a', '3', outFile]);
      } finally {
        await fs.rm(pcm, { force: true });
      }
      return;
    } catch (e) {
      const status = (e as { status?: number }).status;
      const delay = GOOGLE_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined && (status === undefined || status === 429 || status >= 500)) {
        logger.warn(`google tts attempt ${attempt + 1} failed, retrying in ${delay / 1000}s`, { status });
        await sleep(delay);
        continue;
      }
      const msg = String((e as Error).message ?? e);
      const why = status === 401 || status === 403 || /api key|permission/i.test(msg) ? 'API key không hợp lệ hoặc chưa bật Gemini API' : status === 429 ? 'hết hạn mức hoặc bị giới hạn lượt gọi, thử lại sau' : status === 404 ? `không tìm thấy model giọng đọc "${GEMINI_TTS_MODEL()}"` : msg.split('\n')[0]!.slice(0, 200);
      throw new UserFacingError(`Không tạo được giọng đọc Google: ${why}.`, String((e as Error).stack ?? e));
    }
  }
}

async function speak(text: string, voice: VoiceId, outFile: string): Promise<void> {
  if (!VOICES[voice]) throw new UserFacingError('Giọng đọc không hợp lệ');
  if (isGoogleVoice(voice)) return speakGoogle(text, voice, outFile);
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
  const hash = crypto.createHash('sha1').update(`${voice}|${RATE}|${isGoogleVoice(voice) ? DIRECTION_VERSION : ''}|${text}`).digest('hex').slice(0, 16);
  const rel = path.join('tts-preview', `${hash}.mp3`);
  const abs = path.join(MEDIA_DIR, rel);
  try {
    await fs.access(abs);
  } catch {
    await speak(text, voice, abs);
  }
  return rel;
}
