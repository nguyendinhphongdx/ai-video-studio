import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';

export const GET = route(async (req) => {
  const q = req.nextUrl.searchParams;
  const channelId = q.get('channelId');
  const skillId = q.get('skillId');
  if (!channelId || !skillId) throw new ApiError(400, 'validation_error', 'Thiếu channelId hoặc skillId');
  return seriesService.template(channelId, skillId);
});
