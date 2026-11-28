import { z } from 'zod';

import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { channelService } from '@/server/modules/channel/channel.service';

/** The AI logo draft: GET how it stands, POST draw one (worker job), PUT take it as the logo, DELETE throw it away. */
export const GET = route<{ id: string }>(async (_req, { id }) => await channelService.logoDraft(id));
export const POST = route<{ id: string }>(async (req, { id }) => await channelService.requestLogo(id, (await parseJsonBody(req, z.object({ prompt: z.string().max(400).default('') }))).prompt));
export const PUT = route<{ id: string }>(async (_req, { id }) => await channelService.useLogoDraft(id));
export const DELETE = route<{ id: string }>(async (_req, { id }) => await channelService.discardLogoDraft(id));
