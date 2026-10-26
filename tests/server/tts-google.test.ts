import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.AVS_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/avs-tts-test-${process.pid}`;
  process.env.GEMINI_API_KEY = 'test-key';
  return { dir: process.env.AVS_DATA_DIR };
});

import { VOICE_IDS, isGoogleVoice, voiceReady } from '@/core/domain/catalog';

let tts: typeof import('@/server/adapters/tts/tts.service');
let probe: typeof import('@/server/adapters/video/video.service');

beforeAll(async () => {
  fs.mkdirSync(env.dir, { recursive: true });
  tts = await import('@/server/adapters/tts/tts.service');
  probe = await import('@/server/adapters/video/video.service');
  return () => fs.rmSync(env.dir, { recursive: true, force: true });
});
afterEach(() => vi.unstubAllGlobals());

/** Half a second of silence as 16-bit PCM at 24 kHz, the format Gemini TTS returns. */
const pcm = Buffer.alloc(24000 * 2 * 0.5).toString('base64');
const ok = (calls: { url: string; body: Record<string, unknown> }[]) =>
  vi.fn(async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] }), { status: 200 });
  });

describe('Google voices', () => {
  it('are part of the voice catalog and ready only with a Google key', () => {
    expect(VOICE_IDS.filter(isGoogleVoice).length).toBeGreaterThanOrEqual(6);
    expect(voiceReady('gemini-Kore', { tts: true, ttsGoogle: false })).toBe(false);
    expect(voiceReady('gemini-Kore', { tts: false, ttsGoogle: true })).toBe(true);
    expect(voiceReady('vi-VN-HoaiMyNeural', { tts: true, ttsGoogle: false })).toBe(true);
  });

  it('sends the chosen voice to Gemini and returns an mp3 with the right length', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', ok(calls));
    const out = path.join(env.dir, 'line.mp3');
    const seconds = await tts.tts.synthesize('Xin chào các bé!', 'gemini-Puck', out);
    expect(seconds).toBeGreaterThan(0.4);
    expect(seconds).toBeLessThan(0.7);
    expect(fs.existsSync(`${out}.pcm`)).toBe(false);
    expect(await probe.probeDuration(out)).toBeGreaterThan(0.4);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain('gemini-2.5-flash-preview-tts:generateContent');
    const body = calls[0]!.body as { contents: { parts: { text: string }[] }[]; generationConfig: { responseModalities: string[]; speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } } } };
    expect(body.contents[0]!.parts[0]!.text).toContain('Xin chào các bé!');
    expect(body.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
  });

  it('explains a rejected key in plain language and does not retry it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(tts.tts.synthesize('x', 'gemini-Kore', path.join(env.dir, 'bad.mp3'))).rejects.toThrow(/API key không hợp lệ/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches previews by voice and text', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', ok(calls));
    const a = await tts.previewLine('Cùng học nhé', 'gemini-Aoede');
    const b = await tts.previewLine('Cùng học nhé', 'gemini-Aoede');
    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
    expect(await tts.voiceAvailable('gemini-Aoede')).toBe(true);
  });
});
