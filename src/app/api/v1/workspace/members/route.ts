import { route } from '@/server/http/route';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

export const GET = route(() => workspaceService.members());
