import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

export const GET = route<{ id: string }>(async (_req, { id }) => await episodeService.aiRuns(id));
