import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { setupService } from '@/server/modules/setup/setup.service';
import { SetupInput } from '@/server/modules/setup/setup.types';

/** Creates the project the person approved: channel, knowledge, skill, first series and its planned library. */
export const POST = route(async (req) => await setupService.apply(await parseJsonBody(req, SetupInput)));
