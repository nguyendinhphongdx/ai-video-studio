import { ApiError } from '@/server/http/api-error';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { CreateSeriesInput } from '@/server/modules/series/series.types';

export const GET = route(async (req) => {
  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) throw new ApiError(400, 'validation_error', 'Thiếu channelId');
  return seriesService.list(channelId);
});
export const POST = route(async (req) => seriesService.create(await parseJsonBody(req, CreateSeriesInput)));
