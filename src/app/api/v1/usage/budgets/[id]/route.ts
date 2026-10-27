import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';

export const DELETE = route<{ id: string }>(async (_req, { id }) => usageService.removeBudget(id));
