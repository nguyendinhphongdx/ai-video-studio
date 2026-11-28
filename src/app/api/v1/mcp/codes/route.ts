import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { mcpService } from '@/server/modules/mcp/mcp.service';
import { CreateCodeInput } from '@/server/modules/mcp/mcp.types';

export const GET = route(() => mcpService.codes());
/** The response is the only time the code can be read. */
export const POST = route(async (req) => await mcpService.createCode(await parseJsonBody(req, CreateCodeInput)));
