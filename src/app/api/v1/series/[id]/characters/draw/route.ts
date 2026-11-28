import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { characterService, DrawRequest } from '@/server/modules/series/character.service';

/** The drawings under way for this series. */
export const GET = route<{ id: string }>(async (_req, { id }) => await characterService.drawing(id));

/** Queue the missing pictures of one character; they are saved into the series when drawn. Costs one picture each. */
export const POST = route<{ id: string }>(async (req, { id }) => await characterService.requestDraw(id, await parseJsonBody(req, DrawRequest)));
