import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

export const POST = route<{ id: string }>(async (_req, { id }) => await episodeService.approveVideo(id));
