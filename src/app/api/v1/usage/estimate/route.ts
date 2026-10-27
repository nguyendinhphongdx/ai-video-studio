import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { EstimateInput } from '@/server/modules/usage/usage.types';

/** What a batch of pictures and voices is expected to cost (nothing is called). */
export const POST = route(async (req) => usageService.estimate(await parseJsonBody(req, EstimateInput)));
