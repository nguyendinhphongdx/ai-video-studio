// Users, workspaces, memberships and sessions. Tokens are stored as SHA-256 hashes, never in the clear.
import { db } from '@/server/db';

import type { Membership, Role, User, Workspace } from './auth.types';

/** Every table that holds workspace data (each has workspace_id and user_id). */
export const DATA_TABLES = [
  'channels', 'series', 'series_versions', 'series_memory', 'episodes', 'scenes', 'renders', 'episode_memory', 'episode_events', 'jobs',
  'step_runs', 'ai_runs', 'outbox', 'channel_skills', 'channel_knowledge_versions', 'assistant_threads', 'assistant_messages', 'usage_events', 'budgets',
] as const;

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

  workspaceById(id: string): Workspace | null {
    const r = db().prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow | undefined;
    return r ? toWorkspace(r) : null;
  },

  roleIn(workspaceId: string, userId: string): Role | null {
    const r = db().prepare('SELECT role FROM memberships WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId) as { role: Role } | undefined;
    return r?.role ?? null;
  },

  /** The workspace's first owner: who system work acts as when the person who started it is gone. */
  ownerOf(workspaceId: string): string | null {
    const r = db().prepare("SELECT user_id FROM memberships WHERE workspace_id = ? AND role = 'owner' ORDER BY created_at LIMIT 1").get(workspaceId) as { user_id: string } | undefined;
    return r?.user_id ?? null;
  },

  /**
   * Rows made before any account existed (a fresh install's first run) go to the first workspace and account, so no
   * row is ever left outside a workspace. A no-op once every row has one.
   */
  adoptOrphans(workspaceId: string, userId: string) {
    for (const t of DATA_TABLES) db().prepare(`UPDATE ${t} SET workspace_id = ?, user_id = COALESCE(user_id, ?) WHERE workspace_id IS NULL`).run(workspaceId, userId);
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
