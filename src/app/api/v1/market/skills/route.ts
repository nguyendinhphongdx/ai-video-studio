import { route } from '@/server/http/route';
import { marketService } from '@/server/modules/skill/market.service';

/** The skills that can be installed; `?channelId=` marks the ones the channel already has. */
export const GET = route(async (req) => marketService.list(req.nextUrl.searchParams.get('channelId') ?? undefined));
