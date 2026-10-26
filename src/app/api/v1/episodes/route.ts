import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { CreateEpisodeInput } from '@/server/modules/episode/episode.types';

export const GET = route(async (req) => {
  const q = req.nextUrl.searchParams;
  return episodeService.list({ channelId: q.get('channelId') ?? undefined, seriesId: q.get('seriesId') ?? undefined });
});
export const POST = route(async (req) => episodeService.create(await parseJsonBody(req, CreateEpisodeInput)));
