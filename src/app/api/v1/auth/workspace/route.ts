import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/auth.service';
import { SwitchWorkspaceInput } from '@/server/modules/auth/auth.types';

/** Switches the session to another workspace the person belongs to. */
export const PUT = route(async (req) => await authService.switchWorkspace((await parseJsonBody(req, SwitchWorkspaceInput)).workspaceId));
