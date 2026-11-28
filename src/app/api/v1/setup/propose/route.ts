import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { setupService } from '@/server/modules/setup/setup.service';
import { SetupIdea } from '@/server/modules/setup/setup.types';

/** One idea in, a project proposal out (one AI call; nothing is saved). */
export const POST = route(async (req) => await setupService.propose((await parseJsonBody(req, SetupIdea)).idea));
