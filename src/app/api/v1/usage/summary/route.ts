import { route } from '@/server/http/route';
import { RANGES, type UsageRange } from '@/server/modules/usage/usage.types';
import { usageService } from '@/server/modules/usage/usage.service';

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const r = q.get('range') as UsageRange | null;
  return await usageService.summary(r && RANGES.includes(r) ? r : '30d', q.get('channelId') ?? undefined);
});
