import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

type P = { id: string };
const Body = z.object({ markdown: z.string().min(10).max(100_000) });
export const GET = route<P>((_req, { id }) => skillService.get(id));
export const PUT = route<P>(async (req, { id }) => skillService.save(id, (await parseJsonBody(req, Body)).markdown));
