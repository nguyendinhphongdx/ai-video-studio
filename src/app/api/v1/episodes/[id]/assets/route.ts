import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { SceneAssetsInput } from '@/server/modules/episode/episode.types';

/** Queue pictures and/or voices for some scenes (sceneIds) or all of them (null). */
export const POST = route<{ id: string }>(async (req, { id }) => episodeService.requestAssets(id, await parseJsonBody(req, SceneAssetsInput)));
