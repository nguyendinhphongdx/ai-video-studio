import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { SeasonPatch } from '@/server/modules/series/series.types';

export const PUT = route<{ id: string }>(async (req, { id }) => seriesService.saveSeason(id, (await parseJsonBody(req, SeasonPatch)).summary));
