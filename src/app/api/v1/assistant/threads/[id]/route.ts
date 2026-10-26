import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

type P = { id: string };
export const GET = route<P>((_req, { id }) => assistantService.get(id));
export const DELETE = route<P>(async (_req, { id }) => {
  await assistantService.remove(id);
  return { ok: true };
});
