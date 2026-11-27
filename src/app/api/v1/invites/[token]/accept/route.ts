import { route } from '@/server/http/route';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

/** The signed-in person joins the workspace of the invite. */
export const POST = route<{ token: string }>(async (_req, { token }) => await workspaceService.accept(token));
