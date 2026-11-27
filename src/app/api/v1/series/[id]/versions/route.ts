import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';

export const GET = route<{ id: string }>(async (_req, { id }) => await seriesService.versions(id));
