import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { ReorderInput } from '@/server/modules/series/series.types';

export const POST = route<{ id: string }>(async (req, { id }) => seriesService.reorder(id, (await parseJsonBody(req, ReorderInput)).episodeIds));
