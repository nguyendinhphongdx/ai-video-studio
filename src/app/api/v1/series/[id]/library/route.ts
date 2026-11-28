import { route } from '@/server/http/route';
import { setupService } from '@/server/modules/setup/setup.service';

/** Queue the missing library pictures (worker job; poll GET /jobs/:id). Costs one picture per entry. */
export const POST = route<{ id: string }>(async (_req, { id }) => await setupService.requestLibrary(id));
