import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

const Body = z.object({ text: z.string().min(2, 'Dán câu trả lời của Claude vào trước nhé').max(200_000) });
export const POST = route<{ id: string }>(async (req, { id }) => episodeService.importScript(id, (await parseJsonBody(req, Body)).text));
