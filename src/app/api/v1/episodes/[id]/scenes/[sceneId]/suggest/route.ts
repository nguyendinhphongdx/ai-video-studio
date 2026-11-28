import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { SceneFixInput } from '@/server/modules/episode/episode.types';

/** An AI proposal for one scene; nothing is saved. */
export const POST = route<{ id: string; sceneId: string }>(async (req, { id, sceneId }) => await episodeService.suggestSceneFix(id, sceneId, await parseJsonBody(req, SceneFixInput)));
