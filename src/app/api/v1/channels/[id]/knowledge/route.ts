import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { knowledgeService } from '@/server/modules/knowledge/knowledge.service';

const Body = z.object({ markdown: z.string().max(60_000), note: z.string().max(200).default('') });

export const GET = route<{ id: string }>((_req, { id }) => knowledgeService.get(id));
/** Writes a new immutable version of the channel's knowledge. */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const body = await parseJsonBody(req, Body);
  return knowledgeService.save(id, body.markdown, body.note);
});
