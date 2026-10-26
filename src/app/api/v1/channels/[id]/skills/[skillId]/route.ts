import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

type P = { id: string; skillId: string };
const Body = z.object({ markdown: z.string().min(10).max(100_000) });

export const GET = route<P>((_req, { id, skillId }) => skillService.get(id, skillId));
export const PUT = route<P>(async (req, { id, skillId }) => skillService.save(id, skillId, (await parseJsonBody(req, Body)).markdown));
export const DELETE = route<P>(async (_req, { id, skillId }) => {
  await skillService.remove(id, skillId);
  return { ok: true };
});
