import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

const Body = z.object({ feedback: z.string().trim().max(1000).default('') });
export const POST = route<{ id: string }>(async (req, { id }) => episodeService.rejectVideo(id, (await parseJsonBody(req, Body)).feedback));
