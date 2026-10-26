import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { SaveScriptInput } from '@/server/modules/episode/episode.types';

type P = { id: string };
/** Save the person's edits. */
export const PUT = route<P>(async (req, { id }) => episodeService.saveScript(id, await parseJsonBody(req, SaveScriptInput)));
/** Ask the AI to write the script. */
export const POST = route<P>((_req, { id }) => episodeService.requestScript(id));
