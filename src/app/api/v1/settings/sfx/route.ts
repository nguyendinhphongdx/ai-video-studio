import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { prefsService } from '@/server/modules/prefs/prefs.service';

const Body = z.object({ enabled: z.boolean().optional(), volume: z.number().min(0).max(1).optional() });

export const GET = route(() => prefsService.sfx());
export const PUT = route(async (req) => prefsService.saveSfx(await parseJsonBody(req, Body)));
