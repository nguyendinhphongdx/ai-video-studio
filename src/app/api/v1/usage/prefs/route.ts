import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { usageService } from '@/server/modules/usage/usage.service';
import { PrefsInput } from '@/server/modules/usage/usage.types';

export const GET = route(async () => usageService.prefs());
export const PUT = route(async (req) => usageService.savePrefs((await parseJsonBody(req, PrefsInput)).fxUsdVnd));
