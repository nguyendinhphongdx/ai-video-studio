import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { seriesService } from '@/server/modules/series/series.service';
import { WriteBatchInput } from '@/server/modules/series/series.types';

/** Queue scripts for several planned episodes at once. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  await seriesService.get(id);
  return episodeService.requestScripts(id, (await parseJsonBody(req, WriteBatchInput)).episodeIds);
});
