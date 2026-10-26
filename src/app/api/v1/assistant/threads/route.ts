import { z } from 'zod';

import { PERMISSION_MODES, type PermissionMode } from '@/core/assistant/tool';
import { ApiError } from '@/server/http/api-error';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

/** Conversations of a channel (newest first). */
export const GET = route(async (req) => {
  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) throw new ApiError(400, 'validation_error', 'Thiếu channelId');
  return assistantService.threads(channelId);
});

export const POST = route(async (req) => {
  const body = await parseJsonBody(req, z.object({ channelId: z.string().min(1), mode: z.enum(PERMISSION_MODES as [PermissionMode, ...PermissionMode[]]).default('auto') }));
  return assistantService.create(body.channelId, body.mode);
});
