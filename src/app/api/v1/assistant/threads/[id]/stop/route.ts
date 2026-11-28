import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

export const POST = route<{ id: string }>(async (_req, { id }) => await assistantService.stop(id));
