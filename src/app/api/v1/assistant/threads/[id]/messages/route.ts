import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

const Body = z.object({
  text: z.string().max(8000),
  focus: z.object({ route: z.string().max(300).default('/'), episodeId: z.string().nullable().default(null), seriesId: z.string().nullable().default(null), sceneId: z.string().nullable().default(null), skillId: z.string().nullable().default(null) }).default({ route: '/', episodeId: null, seriesId: null, sceneId: null, skillId: null }),
});

/** The person writes to the assistant; the turn runs in the worker (poll GET /threads/:id). */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const body = await parseJsonBody(req, Body);
  return assistantService.send(id, body.text, body.focus);
});
