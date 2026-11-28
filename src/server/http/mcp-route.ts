// The guard of the MCP endpoint. Not `route()`: no cookie here, the caller presents a connection code as a bearer token.
import { dbReady } from '@/server/db';
import { createLogger } from '@/server/logger';
import { handleMcp } from '@/server/modules/mcp/mcp.server';
import { mcpService } from '@/server/modules/mcp/mcp.service';
import { allowed } from '@/server/modules/mcp/rate-limit';

const logger = createLogger('mcp');

const refuse = (status: number, message: string, headers: Record<string, string> = {}) => Response.json({ error: message }, { status, headers });

export async function mcpRoute(req: Request): Promise<Response> {
  try {
    await dbReady();
    const code = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
    const session = await mcpService.authenticate(code);
    if (!session) return refuse(401, 'Mã kết nối không đúng, đã hết hạn hoặc đã bị thu hồi.', { 'WWW-Authenticate': 'Bearer' });
    if (!allowed(session.codeId)) return refuse(429, 'Gọi quá nhiều, thử lại sau một phút.', { 'Retry-After': '60' });
    return await handleMcp(session, req);
  } catch (e) {
    logger.error('mcp request failed', { error: String(e) });
    return refuse(500, 'Máy chủ gặp lỗi.');
  }
}
