import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { PricesInput } from '@/server/modules/usage/usage.types';

export const GET = route(async () => usageService.prices());
/** Replaces the whole price book. */
export const PUT = route(async (req) => usageService.savePrices((await parseJsonBody(req, PricesInput)).prices));
