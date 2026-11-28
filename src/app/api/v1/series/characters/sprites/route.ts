import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { characterSpriteService, SpriteRequest } from '@/server/modules/series/character-sprites.service';

/** Queue the expression sprites of the puppet character (worker job; poll GET /jobs/:id, its result is `{ sprites }`). Costs one picture per expression. */
export const POST = route(async (req) => await characterSpriteService.request(await parseJsonBody(req, SpriteRequest)));
