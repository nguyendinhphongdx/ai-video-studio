import { route } from '@/server/http/route';
import { RANGES, type UsageRange } from '@/server/modules/usage/usage.types';
import { usageService } from '@/server/modules/usage/usage.service';

export const GET = route(async (req) => {
  const r = new URL(req.url).searchParams.get('range') as UsageRange | null;
  return usageService.summary(r && RANGES.includes(r) ? r : '30d');
});
