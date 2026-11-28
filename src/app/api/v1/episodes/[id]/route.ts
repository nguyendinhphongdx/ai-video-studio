import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { EpisodeOptionsInput } from '@/server/modules/episode/episode.types';

type P = { id: string };
export const GET = route<P>(async (_req, { id }) => await episodeService.get(id));
export const PATCH = route<P>(async (req, { id }) => await episodeService.updateOptions(id, await parseJsonBody(req, EpisodeOptionsInput)));
export const DELETE = route<P>(async (_req, { id }) => await episodeService.remove(id));
