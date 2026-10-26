import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

/** Approve or reject a tool call the assistant is waiting on. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const body = await parseJsonBody(req, z.object({ messageId: z.number().int(), approve: z.boolean() }));
  return assistantService.decide(id, body.messageId, body.approve);
});
