import { route } from '@/server/http/route';
import { currentScope } from '@/server/http/scope';
import { parseJsonBody } from '@/server/http/validate';
import { authService, SESSION_COOKIE } from '@/server/modules/auth/auth.service';
import { SwitchWorkspaceInput } from '@/server/modules/auth/auth.types';

/** Switches the session to another workspace the person belongs to. */
export const PUT = route(async (req) => {
  const { workspaceId } = await parseJsonBody(req, SwitchWorkspaceInput);
  return authService.switchWorkspace(req.cookies.get(SESSION_COOKIE)?.value, currentScope(), workspaceId);
});
