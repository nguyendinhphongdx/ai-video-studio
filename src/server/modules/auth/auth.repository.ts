// Users, workspaces, memberships and sessions. Tokens are stored as SHA-256 hashes, never in the clear.
import { db } from '@/server/db';

import type { Membership, Role, User, Workspace } from './auth.types';

type UserRow = { id: string; email: string; name: string; password_hash: string; is_admin: number; created_at: string };
const toUser = (r: UserRow): User & { passwordHash: string } => ({ id: r.id, email: r.email, name: r.name, isAdmin: r.is_admin === 1, createdAt: r.created_at, passwordHash: r.password_hash });

type WorkspaceRow = { id: string; name: string; uses_shared_keys: number; user_id: string | null; created_at: string };
const toWorkspace = (r: WorkspaceRow): Workspace => ({ id: r.id, name: r.name, usesSharedKeys: r.uses_shared_keys === 1, userId: r.user_id, createdAt: r.created_at });

export const authRepository = {
  userCount(): number {
    return (db().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  },

  userByEmail(email: string) {
    const r = db().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return r ? toUser(r) : null;
  },

  userById(id: string) {
    const r = db().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return r ? toUser(r) : null;
  },

  insertUser(u: User & { passwordHash: string }) {
    db().prepare('INSERT INTO users (id, email, name, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.email, u.name, u.passwordHash, u.isAdmin ? 1 : 0, u.createdAt);
  },

  insertWorkspace(w: Workspace) {
    db().prepare('INSERT INTO workspaces (id, name, uses_shared_keys, user_id, created_at) VALUES (?, ?, ?, ?, ?)').run(w.id, w.name, w.usesSharedKeys ? 1 : 0, w.userId, w.createdAt);
  },

  insertMembership(m: Membership) {
    db().prepare('INSERT INTO memberships (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)').run(m.workspaceId, m.userId, m.role, m.createdAt);
  },

  /** The user's workspaces with their role, oldest first (the first is the default). */
  workspacesOf(userId: string): (Workspace & { role: Role })[] {
    const rows = db()
      .prepare('SELECT w.*, m.role FROM workspaces w JOIN memberships m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY m.created_at, w.created_at')
      .all(userId) as (WorkspaceRow & { role: Role })[];
    return rows.map((r) => ({ ...toWorkspace(r), role: r.role }));
  },

  insertSession(s: { tokenHash: string; userId: string; workspaceId: string | null; createdAt: string; expiresAt: string }) {
    db().prepare('INSERT INTO sessions (token_hash, user_id, workspace_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(s.tokenHash, s.userId, s.workspaceId, s.createdAt, s.expiresAt);
  },

  session(tokenHash: string) {
    return (db().prepare('SELECT user_id, workspace_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash) as { user_id: string; workspace_id: string | null; expires_at: string } | undefined) ?? null;
  },

  setSessionWorkspace(tokenHash: string, workspaceId: string) {
    db().prepare('UPDATE sessions SET workspace_id = ? WHERE token_hash = ?').run(workspaceId, tokenHash);
  },

  deleteSession(tokenHash: string) {
    db().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  },

  deleteExpiredSessions(now: string) {
    db().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  },
};
