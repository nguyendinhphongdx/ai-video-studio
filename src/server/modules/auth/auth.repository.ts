// Users, workspaces, memberships and sessions. Tokens are stored as SHA-256 hashes, never in the clear.
import { and, asc, count, eq, lte, sql } from 'drizzle-orm';

import { orm } from '@/server/orm';
import { channels, memberships, sessions, users, workspaces } from '@/server/schema';

import type { Membership, Role, User, Workspace } from './auth.types';

/** Every table that holds workspace data (each has workspace_id and user_id). */
export const DATA_TABLES = [
  'channels', 'series', 'series_versions', 'series_memory', 'episodes', 'scenes', 'renders', 'episode_memory', 'episode_events', 'jobs',
  'step_runs', 'ai_runs', 'outbox', 'channel_skills', 'channel_knowledge_versions', 'assistant_threads', 'assistant_messages', 'usage_events', 'budgets',
] as const;

const toUser = (r: typeof users.$inferSelect): User & { passwordHash: string } => ({ id: r.id, email: r.email, name: r.name, isAdmin: r.isAdmin === 1, createdAt: r.createdAt, passwordHash: r.passwordHash });
const toWorkspace = (r: typeof workspaces.$inferSelect): Workspace => ({ id: r.id, name: r.name, usesSharedKeys: r.usesSharedKeys === 1, userId: r.userId, createdAt: r.createdAt });
const membership = (workspaceId: string, userId: string) => and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId));

export const authRepository = {
  async userCount(): Promise<number> {
    return (await orm().select({ n: count() }).from(users).get())?.n ?? 0;
  },

  async userByEmail(email: string) {
    const r = await orm().select().from(users).where(eq(users.email, email)).get();
    return r ? toUser(r) : null;
  },

  async userById(id: string) {
    const r = await orm().select().from(users).where(eq(users.id, id)).get();
    return r ? toUser(r) : null;
  },

  async insertUser(u: User & { passwordHash: string }) {
    await orm().insert(users).values({ id: u.id, email: u.email, name: u.name, passwordHash: u.passwordHash, isAdmin: u.isAdmin ? 1 : 0, createdAt: u.createdAt });
  },

  async insertWorkspace(w: Workspace) {
    await orm().insert(workspaces).values({ id: w.id, name: w.name, usesSharedKeys: w.usesSharedKeys ? 1 : 0, userId: w.userId, createdAt: w.createdAt });
  },

  async insertMembership(m: Membership) {
    await orm().insert(memberships).values(m);
  },

  /** The user's workspaces with their role, oldest first (the first is the default). */
  async workspacesOf(userId: string): Promise<(Workspace & { role: Role })[]> {
    const rows = await orm()
      .select({ w: workspaces, role: memberships.role })
      .from(workspaces)
      .innerJoin(memberships, eq(memberships.workspaceId, workspaces.id))
      .where(eq(memberships.userId, userId))
      .orderBy(asc(memberships.createdAt), asc(workspaces.createdAt));
    return rows.map((r) => ({ ...toWorkspace(r.w), role: r.role as Role }));
  },

  async workspaceById(id: string): Promise<Workspace | null> {
    const r = await orm().select().from(workspaces).where(eq(workspaces.id, id)).get();
    return r ? toWorkspace(r) : null;
  },

  async roleIn(workspaceId: string, userId: string): Promise<Role | null> {
    const r = await orm().select({ role: memberships.role }).from(memberships).where(membership(workspaceId, userId)).get();
    return (r?.role as Role | undefined) ?? null;
  },

  /** The workspace's first owner: who system work acts as when the person who started it is gone. */
  async ownerOf(workspaceId: string): Promise<string | null> {
    const r = await orm().select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.role, 'owner'))).orderBy(asc(memberships.createdAt)).limit(1).get();
    return r?.userId ?? null;
  },

  /**
   * Rows made before any account existed (a fresh install's first run) go to the first workspace and account, so no
   * row is ever left outside a workspace. A no-op once every row has one.
   */
  async adoptOrphans(workspaceId: string, userId: string) {
    for (const t of DATA_TABLES) await orm().run(sql`UPDATE ${sql.identifier(t)} SET workspace_id = ${workspaceId}, user_id = COALESCE(user_id, ${userId}) WHERE workspace_id IS NULL`);
  },

  /** Every workspace with its first owner and counts (the system admin's overview). */
  async allWorkspaces(): Promise<(Workspace & { ownerEmail: string; members: number; projects: number })[]> {
    const rows = await orm()
      .select({
        w: workspaces,
        ownerEmail: sql<string | null>`(SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ${workspaces.id} AND m.role = 'owner' ORDER BY m.created_at LIMIT 1)`,
        members: sql<number>`(SELECT COUNT(*) FROM ${memberships} m WHERE m.workspace_id = ${workspaces.id})`.mapWith(Number),
        projects: sql<number>`(SELECT COUNT(*) FROM ${channels} c WHERE c.workspace_id = ${workspaces.id})`.mapWith(Number),
      })
      .from(workspaces)
      .orderBy(asc(workspaces.createdAt));
    return rows.map((r) => ({ ...toWorkspace(r.w), ownerEmail: r.ownerEmail ?? '', members: r.members, projects: r.projects }));
  },

  async setSharedKeys(workspaceId: string, allowed: boolean): Promise<boolean> {
    return (await orm().update(workspaces).set({ usesSharedKeys: allowed ? 1 : 0 }).where(eq(workspaces.id, workspaceId)).returning({ id: workspaces.id })).length > 0;
  },

  async insertSession(s: { tokenHash: string; userId: string; workspaceId: string | null; createdAt: string; expiresAt: string }) {
    await orm().insert(sessions).values(s);
  },

  async session(tokenHash: string) {
    return (await orm().select({ userId: sessions.userId, workspaceId: sessions.workspaceId, expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.tokenHash, tokenHash)).get()) ?? null;
  },

  async setSessionWorkspace(tokenHash: string, workspaceId: string) {
    await orm().update(sessions).set({ workspaceId }).where(eq(sessions.tokenHash, tokenHash));
  },

  async deleteSession(tokenHash: string) {
    await orm().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  },

  async deleteExpiredSessions(now: string) {
    await orm().delete(sessions).where(lte(sessions.expiresAt, now));
  },
};
