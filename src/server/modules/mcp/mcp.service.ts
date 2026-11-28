// Connection codes for outside AI (MCP): who may create them, what a presented code is worth, and what it did.
import { createHash, randomBytes } from 'node:crypto';

import type { AccessLevel } from '@/core/assistant/tool';
import { newId } from '@/core/domain/ids';
import { makeContext, requireOwner, type RequestContext } from '@/server/context';
import { ApiError } from '@/server/http/api-error';
import { authRepository } from '@/server/modules/auth/auth.repository';

import { mcpRepository } from './mcp.repository';
import { CreateCodeInput, type McpCallView, type McpCodeView } from './mcp.types';

const PREFIX = 'avs_mcp_';
const hash = (code: string) => createHash('sha256').update(code).digest('hex');
const now = () => new Date().toISOString();

type Row = Awaited<ReturnType<typeof mcpRepository.codes>>[number];
const view = (r: Row): McpCodeView => ({ id: r.id, name: r.name, level: r.level as AccessLevel, createdAt: r.createdAt, expiresAt: r.expiresAt, lastUsedAt: r.lastUsedAt, expired: Boolean(r.expiresAt && r.expiresAt <= now()) });

/** What a request with a valid code acts as. */
export interface McpSession {
  context: RequestContext;
  codeId: string;
  level: AccessLevel;
}

export const mcpService = {
  /** The code itself is returned once, here; it cannot be read again. */
  async createCode(input: CreateCodeInput): Promise<{ code: string; view: McpCodeView }> {
    requireOwner();
    const { name, level, expiresInDays } = CreateCodeInput.parse(input);
    const code = PREFIX + randomBytes(32).toString('base64url');
    const id = newId();
    const expiresAt = expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
    await mcpRepository.insertCode({ id, name, level, codeHash: hash(code), createdAt: now(), expiresAt });
    return { code, view: view((await mcpRepository.findCode(id))!) };
  },

  async codes(): Promise<McpCodeView[]> {
    requireOwner();
    return (await mcpRepository.codes()).map(view);
  },

  async revoke(id: string): Promise<void> {
    requireOwner();
    if (!(await mcpRepository.findCode(id))) throw new ApiError(404, 'not_found', 'Không tìm thấy mã kết nối.');
    await mcpRepository.revoke(id, now());
  },

  async calls(codeId: string): Promise<McpCallView[]> {
    requireOwner();
    return (await mcpRepository.calls(codeId)).map((c) => ({ id: c.id, tool: c.tool, summary: c.summary, ok: c.ok, at: c.at }));
  },

  /** Null for an unknown, revoked or expired code, or when whoever made it no longer owns the workspace. */
  async authenticate(code: string | undefined): Promise<McpSession | null> {
    if (!code?.startsWith(PREFIX)) return null;
    const r = await mcpRepository.codeByHash(hash(code));
    if (!r || r.revokedAt || (r.expiresAt && r.expiresAt <= now()) || !r.workspaceId || !r.userId) return null;
    if ((await authRepository.roleIn(r.workspaceId, r.userId)) !== 'owner') return null;
    const [user, workspace] = await Promise.all([authRepository.userById(r.userId), authRepository.workspaceById(r.workspaceId)]);
    if (!user || !workspace) return null;
    const { passwordHash: _, ...person } = user;
    return { context: { ...makeContext(person, workspace, 'owner'), usage: { via: 'mcp' } }, codeId: r.id, level: r.level as AccessLevel };
  },

  /** Inside the session's context. */
  async record(codeId: string, tool: string, summary: string, ok: boolean): Promise<void> {
    const at = now();
    await mcpRepository.addCall({ codeId, tool, summary: summary.slice(0, 300), ok, at });
    await mcpRepository.touch(codeId, at);
  },
};
