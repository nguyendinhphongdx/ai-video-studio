import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

const Body = z.object({ id: z.string().min(2), markdown: z.string().min(10).max(100_000) });
export const GET = route(() => skillService.list());
export const POST = route(async (req) => {
  const { id, markdown } = await parseJsonBody(req, Body);
  return skillService.save(id, markdown, { create: true });
});
