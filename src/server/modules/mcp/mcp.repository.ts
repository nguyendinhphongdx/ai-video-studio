import { and, desc, eq, isNull, lt } from 'drizzle-orm';

import type { AccessLevel } from '@/core/assistant/tool';
import { one, orm, owner, scoped } from '@/server/orm';
import { mcpCalls, mcpCodes } from '@/server/schema';

/** The newest calls kept for each code. */
const KEPT_CALLS = 500;

export const mcpRepository = {
  async insertCode(c: { id: string; name: string; codeHash: string; level: AccessLevel; createdAt: string; expiresAt: string | null }) {
    await orm().insert(mcpCodes).values({ ...c, ...owner() });
  },

  async codes() {
    return orm().select().from(mcpCodes).where(and(scoped(mcpCodes), isNull(mcpCodes.revokedAt))).orderBy(desc(mcpCodes.createdAt));
  },

  async findCode(id: string) {
    return orm().select().from(mcpCodes).where(and(scoped(mcpCodes), eq(mcpCodes.id, id))).then(one);
  },

  async revoke(id: string, at: string) {
    await orm().update(mcpCodes).set({ revokedAt: at }).where(and(scoped(mcpCodes), eq(mcpCodes.id, id)));
  },

  /** The one lookup that is not scoped by workspace: the code is what decides the workspace. */
  async codeByHash(hash: string) {
    return orm().select().from(mcpCodes).where(eq(mcpCodes.codeHash, hash)).then(one);
  },

  async touch(id: string, at: string) {
    await orm().update(mcpCodes).set({ lastUsedAt: at }).where(and(scoped(mcpCodes), eq(mcpCodes.id, id)));
  },

  async addCall(call: { codeId: string; tool: string; summary: string; ok: boolean; at: string }) {
    await orm().insert(mcpCalls).values({ ...call, ...owner() });
    const oldest = await orm().select({ id: mcpCalls.id }).from(mcpCalls).where(and(scoped(mcpCalls), eq(mcpCalls.codeId, call.codeId))).orderBy(desc(mcpCalls.id)).offset(KEPT_CALLS - 1).limit(1).then(one);
    if (oldest) await orm().delete(mcpCalls).where(and(scoped(mcpCalls), eq(mcpCalls.codeId, call.codeId), lt(mcpCalls.id, oldest.id)));
  },

  async calls(codeId: string, limit = 50) {
    return orm().select().from(mcpCalls).where(and(scoped(mcpCalls), eq(mcpCalls.codeId, codeId))).orderBy(desc(mcpCalls.id)).limit(limit);
  },
};
