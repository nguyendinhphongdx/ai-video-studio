import { z } from 'zod';

import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/auth.service';

const Body = z.object({ usesSharedKeys: z.boolean() });

/** Allow or stop a workspace's use of the shared AI keys (system admin). */
export const PATCH = route<{ id: string }>(async (req, { id }) => await authService.setSharedKeys(id, (await parseJsonBody(req, Body)).usesSharedKeys));
