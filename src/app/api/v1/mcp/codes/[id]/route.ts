import { route } from '@/server/http/route';
import { mcpService } from '@/server/modules/mcp/mcp.service';

/** What the code did, newest first. */
export const GET = route<{ id: string }>((_req, { id }) => mcpService.calls(id));
export const DELETE = route<{ id: string }>((_req, { id }) => mcpService.revoke(id));
