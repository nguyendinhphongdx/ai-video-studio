import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

export const dynamic = 'force-dynamic';

// AG-UI events as server-sent events. The browser sends Last-Event-ID when it reconnects.
export const GET = route<{ id: string }>(async (req, { id }) => {
  const after = Number(req.headers.get('last-event-id') ?? req.nextUrl.searchParams.get('after') ?? 0);
  return await assistantService.events(id, Number.isFinite(after) ? after : 0, req.signal);
});
