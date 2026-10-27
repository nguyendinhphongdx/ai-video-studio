import { z } from 'zod';

import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { prefsService } from '@/server/modules/prefs/prefs.service';

const Body = z.object({ dismissed: z.boolean() });

export const GET = route(async () => ({ dismissed: prefsService.onboardingDismissed() }));
export const PUT = route(async (req) => ({ dismissed: prefsService.setOnboardingDismissed((await parseJsonBody(req, Body)).dismissed) }));
