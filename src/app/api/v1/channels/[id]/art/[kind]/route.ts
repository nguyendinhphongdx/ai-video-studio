import { z } from 'zod';

import { ApiError } from '@/server/http/api-error';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { channelService } from '@/server/modules/channel/channel.service';

const Kind = z.enum(['intro', 'outro']);
const kindOf = (k: string) => {
  const r = Kind.safeParse(k);
  if (!r.success) throw new ApiError(400, 'validation_error', 'kind phải là intro hoặc outro');
  return r.data;
};

/** Queue AI background art for the intro or outro (worker job; poll GET /jobs/:id, then reload the channel). */
export const POST = route<{ id: string; kind: string }>(async (req, { id, kind }) => channelService.requestArt(id, kindOf(kind), (await parseJsonBody(req, z.object({ prompt: z.string().max(400).default('') }))).prompt));
export const DELETE = route<{ id: string; kind: string }>((_req, { id, kind }) => channelService.removeArt(id, kindOf(kind)));
