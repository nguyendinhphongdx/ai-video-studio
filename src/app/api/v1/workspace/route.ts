import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { RenameWorkspaceInput } from '@/server/modules/workspace/workspace.types';

/** Rename the current workspace (owner). */
export const PATCH = route(async (req) => await workspaceService.rename((await parseJsonBody(req, RenameWorkspaceInput)).name));
