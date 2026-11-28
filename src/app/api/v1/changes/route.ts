import { SESSION_COOKIE } from '@/server/modules/auth/auth.service';
import { changesService } from '@/server/modules/changes/changes.service';
import { route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

// Live signals as server-sent events. The browser sends Last-Event-ID when it reconnects.
export const GET = route(async (req) => changesService.feed(Number(req.headers.get('last-event-id') ?? req.nextUrl.searchParams.get('after') ?? 0), req.cookies.get(SESSION_COOKIE)?.value, req.signal));
