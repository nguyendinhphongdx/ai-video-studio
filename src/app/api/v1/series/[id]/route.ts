import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { SeriesPatch } from '@/server/modules/series/series.types';

export const GET = route<{ id: string }>((_req, { id }) => seriesService.get(id));
export const PATCH = route<{ id: string }>(async (req, { id }) => seriesService.update(id, await parseJsonBody(req, SeriesPatch)));
