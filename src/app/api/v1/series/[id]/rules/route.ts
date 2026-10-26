import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { SeriesRulesInput } from '@/server/modules/series/series.types';

export const PUT = route<{ id: string }>(async (req, { id }) => seriesService.saveRules(id, await parseJsonBody(req, SeriesRulesInput)));
