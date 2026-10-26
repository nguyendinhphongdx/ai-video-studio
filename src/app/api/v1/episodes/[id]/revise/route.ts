import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

const Body = z.object({ feedback: z.string().trim().min(2, 'Gõ yêu cầu sửa trước nhé').max(1000) });
export const POST = route<{ id: string }>(async (req, { id }) => episodeService.revise(id, (await parseJsonBody(req, Body)).feedback));
