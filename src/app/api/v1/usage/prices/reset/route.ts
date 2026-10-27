import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';

/** Back to the starting prices. */
export const POST = route(async () => usageService.resetPrices());
