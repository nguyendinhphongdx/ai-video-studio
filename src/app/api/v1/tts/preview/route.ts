import { z } from 'zod';

import { VOICE_IDS, isGoogleVoice, type VoiceId } from '@/core/domain';
import { mediaUrl } from '@/server/adapters/media/media.service';
import { previewLine, voiceAvailable } from '@/server/adapters/tts/tts.service';
import { ApiError } from '@/server/http/api-error';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';

const Body = z.object({ text: z.string().trim().min(1, 'Chưa có lời đọc').max(500), voice: z.enum(VOICE_IDS as [string, ...string[]]) });

export const POST = route(async (req) => {
  const { text, voice } = await parseJsonBody(req, Body);
  if (!(await voiceAvailable(voice))) throw new ApiError(400, 'tts_unavailable', isGoogleVoice(voice) ? 'Chưa có Google API key cho giọng Google (nhập ở Cài đặt)' : 'Giọng đọc đang tắt (chưa cài edge-tts)');
  return { url: mediaUrl(await previewLine(text, voice as VoiceId)) };
});
