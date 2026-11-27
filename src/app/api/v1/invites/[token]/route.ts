import { publicRoute } from '@/server/http/route';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

/** What an invite link is for; open to whoever has the link, signed in or not. */
export const GET = publicRoute<{ token: string }>(async (_req, { token }) => await workspaceService.preview(token));
