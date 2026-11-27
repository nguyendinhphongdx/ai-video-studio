// Members and invites of the current workspace (from ctx()). Invite lookups by token are the one exception: a link
// is opened by someone who is not in the workspace yet.
import { ctx } from '@/server/context';
import { db } from '@/server/db';

import type { Role } from '../auth/auth.types';
import type { InviteView, Member } from './workspace.types';

type InviteRow = { id: string; token_hash: string; workspace_id: string; user_id: string | null; email: string; role: Role; created_at: string; expires_at: string; used_at: string | null };

export const workspaceRepository = {
  members(): Member[] {
    const rows = db()
      .prepare('SELECT u.id, u.name, u.email, m.role, m.created_at FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY m.created_at')
      .all(ctx().workspaceId) as { id: string; name: string; email: string; role: Role; created_at: string }[];
    return rows.map((r) => ({ userId: r.id, name: r.name, email: r.email, role: r.role, joinedAt: r.created_at }));
  },

  ownerCount(): number {
    return (db().prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ? AND role = 'owner'").get(ctx().workspaceId) as { n: number }).n;
  },

  memberRole(userId: string): Role | null {
    const r = db().prepare('SELECT role FROM memberships WHERE workspace_id = ? AND user_id = ?').get(ctx().workspaceId, userId) as { role: Role } | undefined;
    return r?.role ?? null;
  },

  setRole(userId: string, role: Role) {
    db().prepare('UPDATE memberships SET role = ? WHERE workspace_id = ? AND user_id = ?').run(role, ctx().workspaceId, userId);
  },

  removeMember(userId: string) {
    db().prepare('DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?').run(ctx().workspaceId, userId);
  },

  rename(name: string) {
    db().prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name, ctx().workspaceId);
  },

  insertInvite(i: { id: string; tokenHash: string; email: string; role: Role; createdAt: string; expiresAt: string }) {
    db()
      .prepare('INSERT INTO invites (id, token_hash, workspace_id, user_id, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(i.id, i.tokenHash, ctx().workspaceId, ctx().userId, i.email, i.role, i.createdAt, i.expiresAt);
  },

  /** Open invites of the current workspace (not used, not expired). */
  invites(now: string): InviteView[] {
    const rows = db()
      .prepare('SELECT i.*, COALESCE(u.name, u.email, \'\') AS by_name FROM invites i LEFT JOIN users u ON u.id = i.user_id WHERE i.workspace_id = ? AND i.used_at IS NULL AND i.expires_at > ? ORDER BY i.created_at DESC')
      .all(ctx().workspaceId, now) as (InviteRow & { by_name: string })[];
    return rows.map((r) => ({ id: r.id, email: r.email, role: r.role, invitedBy: r.by_name, createdAt: r.created_at, expiresAt: r.expires_at }));
  },

  revokeInvite(id: string) {
    db().prepare('DELETE FROM invites WHERE id = ? AND workspace_id = ? AND used_at IS NULL').run(id, ctx().workspaceId);
  },

  /** An invite by its token hash, whatever workspace it is for (the link is opened from outside it). */
  inviteByToken(tokenHash: string): (InviteRow & { workspace_name: string; by_name: string }) | null {
    return (
      (db()
        .prepare('SELECT i.*, w.name AS workspace_name, COALESCE(u.name, u.email, \'\') AS by_name FROM invites i JOIN workspaces w ON w.id = i.workspace_id LEFT JOIN users u ON u.id = i.user_id WHERE i.token_hash = ?')
        .get(tokenHash) as (InviteRow & { workspace_name: string; by_name: string }) | undefined) ?? null
    );
  },

  /** Joins the signed-in person to the invite's workspace and marks the invite used, in one go. */
  acceptInvite(invite: { id: string; workspace_id: string; role: Role }, at: string): boolean {
    const d = db();
    d.exec('BEGIN IMMEDIATE');
    try {
      const used = d.prepare('UPDATE invites SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL').run(at, ctx().userId, invite.id);
      if (!used.changes) {
        d.exec('ROLLBACK');
        return false;
      }
      d.prepare('INSERT INTO memberships (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id, user_id) DO NOTHING').run(invite.workspace_id, ctx().userId, invite.role, at);
      d.exec('COMMIT');
      return true;
    } catch (e) {
      d.exec('ROLLBACK');
      throw e;
    }
  },
};
