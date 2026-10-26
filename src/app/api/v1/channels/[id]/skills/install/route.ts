import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

/** Install a market skill into the channel (a copy the channel owns from then on). */
export const POST = route<{ id: string }>(async (req, { id }) => skillService.install(id, (await parseJsonBody(req, z.object({ marketId: z.string().min(2) }))).marketId));
