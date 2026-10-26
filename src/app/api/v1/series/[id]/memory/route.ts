import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';

export const GET = route<{ id: string }>((_req, { id }) => seriesService.memory(id));
