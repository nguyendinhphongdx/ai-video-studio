import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

const Body = z.object({ id: z.string().min(2), markdown: z.string().min(10).max(100_000), source: z.enum(['custom', 'ai']).default('custom') });

/** The skills this channel owns. */
export const GET = route<{ id: string }>((_req, { id }) => skillService.list(id));
export const POST = route<{ id: string }>(async (req, { id }) => {
  const body = await parseJsonBody(req, Body);
  return skillService.save(id, body.id, body.markdown, { create: true, source: body.source });
});
