import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { PrefsInput } from '@/server/modules/usage/usage.types';

export const GET = route(() => usageService.prefs());
export const PUT = route(async (req) => await usageService.savePrefs((await parseJsonBody(req, PrefsInput)).fxUsdVnd));
