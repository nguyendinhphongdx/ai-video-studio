import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { BudgetInput } from '@/server/modules/usage/usage.types';

export const GET = route(async () => usageService.budgets());
/** Creates a budget, or updates the one named by `id`. */
export const POST = route(async (req) => usageService.saveBudget(await parseJsonBody(req, BudgetInput)));
