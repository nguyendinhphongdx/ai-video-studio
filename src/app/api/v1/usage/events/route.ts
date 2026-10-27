import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { RANGES, type UsageRange } from '@/server/modules/usage/usage.types';

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const range = q.get('range') as UsageRange | null;
  const kind = q.get('kind');
  return usageService.events({
    range: range && RANGES.includes(range) ? range : undefined,
    before: q.get('before') ?? undefined,
    kind: kind === 'llm' || kind === 'image' || kind === 'tts' ? kind : undefined,
    channelId: q.get('channelId') ?? undefined,
    episodeId: q.get('episodeId') ?? undefined,
    limit: Number(q.get('limit')) || undefined,
  });
});
