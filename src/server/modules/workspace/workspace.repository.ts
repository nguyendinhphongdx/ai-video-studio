// Members and invites of the current workspace (from ctx()). Invite lookups by token are the one exception: a link
// is opened by someone who is not in the workspace yet.
import { and, asc, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { ctx } from '@/server/context';
import { transaction } from '@/server/db';
import { orm } from '@/server/orm';
import { invites, memberships, users, workspaces } from '@/server/schema';

import type { Role } from '../auth/auth.types';
import type { InviteView, Member } from './workspace.types';

/** An invite as the service reads it. */
export interface InviteRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  workspaceName: string;
  byName: string;
}

/** Members of the current workspace (memberships are scoped by their workspace_id like data rows). */
const here = () => eq(memberships.workspaceId, ctx().workspaceId);
const member = (userId: string) => and(here(), eq(memberships.userId, userId));
const byName = sql<string>`COALESCE(${users.name}, ${users.email}, '')`;

export const workspaceRepository = {
  async members(): Promise<Member[]> {
    const rows = await orm()
      .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role, joinedAt: memberships.createdAt })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(here())
      .orderBy(asc(memberships.createdAt));
    return rows.map((r) => ({ ...r, role: r.role as Role }));
  },

  async ownerCount(): Promise<number> {
    return (await orm().select({ n: count() }).from(memberships).where(and(here(), eq(memberships.role, 'owner'))).get())?.n ?? 0;
  },

  async memberRole(userId: string): Promise<Role | null> {
    const r = await orm().select({ role: memberships.role }).from(memberships).where(member(userId)).get();
    return (r?.role as Role | undefined) ?? null;
  },

  async setRole(userId: string, role: Role) {
    await orm().update(memberships).set({ role }).where(member(userId));
  },

  async removeMember(userId: string) {
    await orm().delete(memberships).where(member(userId));
  },

  async rename(name: string) {
    await orm().update(workspaces).set({ name }).where(eq(workspaces.id, ctx().workspaceId));
  },

  async insertInvite(i: { id: string; tokenHash: string; email: string; role: Role; createdAt: string; expiresAt: string }) {
    await orm().insert(invites).values({ ...i, workspaceId: ctx().workspaceId, userId: ctx().userId });
  },

  /** Open invites of the current workspace (not used, not expired). */
  async invites(now: string): Promise<InviteView[]> {
    const rows = await orm()
      .select({ id: invites.id, email: invites.email, role: invites.role, invitedBy: byName, createdAt: invites.createdAt, expiresAt: invites.expiresAt })
      .from(invites)
      .leftJoin(users, eq(users.id, invites.userId))
      .where(and(eq(invites.workspaceId, ctx().workspaceId), isNull(invites.usedAt), gt(invites.expiresAt, now)))
      .orderBy(desc(invites.createdAt));
    return rows.map((r) => ({ ...r, role: r.role as Role }));
  },

  async revokeInvite(id: string) {
    await orm().delete(invites).where(and(eq(invites.id, id), eq(invites.workspaceId, ctx().workspaceId), isNull(invites.usedAt)));
  },

  /** An invite by its token hash, whatever workspace it is for (the link is opened from outside it). */
  async inviteByToken(tokenHash: string): Promise<InviteRecord | null> {
    const r = await orm()
      .select({
        id: invites.id, workspaceId: invites.workspaceId, email: invites.email, role: invites.role, createdAt: invites.createdAt, expiresAt: invites.expiresAt, usedAt: invites.usedAt,
        workspaceName: workspaces.name, byName,
      })
      .from(invites)
      .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
      .leftJoin(users, eq(users.id, invites.userId))
      .where(eq(invites.tokenHash, tokenHash))
      .get();
    return r ? { ...r, role: r.role as Role } : null;
  },

  /** Joins the signed-in person to the invite's workspace and marks the invite used, in one go. */
  async acceptInvite(invite: { id: string; workspaceId: string; role: Role }, at: string): Promise<boolean> {
    return await transaction(async () => {
      const used = await orm().update(invites).set({ usedAt: at, usedBy: ctx().userId }).where(and(eq(invites.id, invite.id), isNull(invites.usedAt))).returning({ id: invites.id });
      if (!used.length) return false;
      await orm().insert(memberships).values({ workspaceId: invite.workspaceId, userId: ctx().userId, role: invite.role, createdAt: at }).onConflictDoNothing();
      return true;
    });
  },
};
