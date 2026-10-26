import { z } from 'zod';

import { PERMISSION_MODES, type PermissionMode } from '@/core/assistant/tool';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

export const PUT = route<{ id: string }>(async (req, { id }) => assistantService.setMode(id, (await parseJsonBody(req, z.object({ mode: z.enum(PERMISSION_MODES as [PermissionMode, ...PermissionMode[]]) }))).mode));
