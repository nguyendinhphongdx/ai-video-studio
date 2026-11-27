import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { SetRoleInput } from '@/server/modules/workspace/workspace.types';

/** Change a member's role (owner). */
export const PATCH = route<{ userId: string }>(async (req, { userId }) => workspaceService.setRole(userId, (await parseJsonBody(req, SetRoleInput)).role));
/** Remove a member (owner). */
export const DELETE = route<{ userId: string }>(async (_req, { userId }) => workspaceService.removeMember(userId));
