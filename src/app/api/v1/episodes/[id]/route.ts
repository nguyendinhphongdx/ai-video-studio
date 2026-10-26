import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { EpisodeOptionsInput } from '@/server/modules/episode/episode.types';

type P = { id: string };
export const GET = route<P>((_req, { id }) => episodeService.get(id));
export const PATCH = route<P>(async (req, { id }) => episodeService.updateOptions(id, await parseJsonBody(req, EpisodeOptionsInput)));
export const DELETE = route<P>((_req, { id }) => episodeService.remove(id));
