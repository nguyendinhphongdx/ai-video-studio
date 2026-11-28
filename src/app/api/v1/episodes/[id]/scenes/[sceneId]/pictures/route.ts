import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { UsePictureInput } from '@/server/modules/episode/episode.types';

export const GET = route<{ id: string; sceneId: string }>(async (_req, { id, sceneId }) => await episodeService.scenePictures(id, sceneId));

/** Put an earlier picture back on the scene. */
export const POST = route<{ id: string; sceneId: string }>(async (req, { id, sceneId }) => await episodeService.useScenePicture(id, sceneId, (await parseJsonBody(req, UsePictureInput)).name));
