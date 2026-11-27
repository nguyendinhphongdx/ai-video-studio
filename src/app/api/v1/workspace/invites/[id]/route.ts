import { route } from '@/server/http/route';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

/** Revoke an unused invite (owner). */
export const DELETE = route<{ id: string }>(async (_req, { id }) => await workspaceService.revokeInvite(id));
