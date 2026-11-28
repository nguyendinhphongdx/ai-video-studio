import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';

/** What each video of a channel has cost so far, by episode id. */
export const GET = route(async (req) => {
  const channelId = new URL(req.url).searchParams.get('channelId');
  if (!channelId) throw new ApiError(400, 'validation_error', 'Thiếu channelId');
  return await usageService.episodeCosts(channelId);
});
