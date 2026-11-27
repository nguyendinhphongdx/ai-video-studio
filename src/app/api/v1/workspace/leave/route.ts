import { route } from '@/server/http/route';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

/** The signed-in person leaves the current workspace. */
export const POST = route(async () => workspaceService.leave());
