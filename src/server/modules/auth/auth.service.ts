// Sign-up, log-in, sessions. Passwords use scrypt (node:crypto); session tokens are random and stored hashed.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

import { newId } from '@/core/domain/ids';
import { ApiError } from '@/server/http/api-error';

import { authRepository } from './auth.repository';
import type { AuthScope, LogInInput, MeView, SignUpInput, User, Workspace } from './auth.types';

const scrypt = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'avs_session';
export const SESSION_DAYS = 30;

const unauthorized = () => new ApiError(401, 'unauthorized', 'Bạn cần đăng nhập.');
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await scrypt(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const got = await scrypt(password, salt, 64);
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** Starts a session in the user's chosen (or first) workspace; returns the raw token for the cookie. */
function startSession(userId: string, workspaceId: string | null): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  authRepository.insertSession({ tokenHash: sha256(token), userId, workspaceId, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString() });
  return token;
}

const publicUser = (u: User & { passwordHash?: string }): User => ({ id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin, createdAt: u.createdAt });

export const authService = {
  /**
   * Creates the account and its own workspace (the person is its owner). The very first account becomes the system
   * admin; its workspace may use the shared AI keys (which are the admin's own).
   */
  async signUp(input: SignUpInput): Promise<{ token: string; user: User }> {
    if (authRepository.userByEmail(input.email)) throw new ApiError(409, 'conflict', 'Email này đã có tài khoản. Hãy đăng nhập.');
    const now = new Date().toISOString();
    const first = authRepository.userCount() === 0;
    const user: User = { id: newId(), email: input.email, name: input.name, isAdmin: first, createdAt: now };
    const workspace: Workspace = { id: newId(), name: input.workspaceName || (first ? 'Studio chính' : `Workspace của ${input.name}`), usesSharedKeys: first, userId: user.id, createdAt: now };
    authRepository.insertUser({ ...user, passwordHash: await hashPassword(input.password) });
    authRepository.insertWorkspace(workspace);
    authRepository.insertMembership({ workspaceId: workspace.id, userId: user.id, role: 'owner', createdAt: now });
    if (first) authRepository.adoptOrphans(workspace.id, user.id);
    return { token: startSession(user.id, workspace.id), user };
  },

  async logIn(input: LogInInput): Promise<{ token: string; user: User }> {
    const u = authRepository.userByEmail(input.email);
    // Same message whether the email exists or not, and a hash is always computed (no timing hint).
    const ok = await verifyPassword(input.password, u?.passwordHash ?? 'scrypt$00$00');
    if (!u || !ok) throw new ApiError(401, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.');
    authRepository.deleteExpiredSessions(new Date().toISOString());
    return { token: startSession(u.id, authRepository.workspacesOf(u.id)[0]?.id ?? null), user: publicUser(u) };
  },

  logOut(token: string | undefined) {
    if (token) authRepository.deleteSession(sha256(token));
  },

  /** The scope of a session token, or null when it is missing, unknown or expired. */
  scopeOf(token: string | undefined): AuthScope | null {
    if (!token) return null;
    const s = authRepository.session(sha256(token));
    if (!s || s.expires_at <= new Date().toISOString()) return null;
    const user = authRepository.userById(s.user_id);
    if (!user) return null;
    const all = authRepository.workspacesOf(user.id);
    // The session's workspace if the person still belongs to it, else their first one.
    const current = all.find((w) => w.id === s.workspace_id) ?? all[0];
    if (!current) return null;
    const { role, ...workspace } = current;
    return { user: publicUser(user), workspace, role };
  },

  /** Throws 401 when signed out. */
  requireScope(token: string | undefined): AuthScope {
    const scope = authService.scopeOf(token);
    if (!scope) throw unauthorized();
    return scope;
  },

  /**
   * The scope a worker job runs in: the job's workspace, acting as the person who started it (or the workspace's first
   * owner when that person is gone). Null when the workspace no longer exists.
   */
  scopeFor(workspaceId: string | null, userId: string | null): AuthScope | null {
    const workspace = workspaceId ? authRepository.workspaceById(workspaceId) : null;
    if (!workspace) return null;
    const actor = (userId && authRepository.roleIn(workspace.id, userId) ? userId : null) ?? authRepository.ownerOf(workspace.id);
    const user = actor ? authRepository.userById(actor) : null;
    if (!user) return null;
    return { user: publicUser(user), workspace, role: authRepository.roleIn(workspace.id, user.id) ?? 'member' };
  },

  me(scope: AuthScope): MeView {
    return { ...scope, workspaces: authRepository.workspacesOf(scope.user.id) };
  },

  switchWorkspace(token: string | undefined, scope: AuthScope, workspaceId: string): MeView {
    if (!authRepository.workspacesOf(scope.user.id).some((w) => w.id === workspaceId)) throw new ApiError(404, 'not_found', 'Không tìm thấy workspace');
    authRepository.setSessionWorkspace(sha256(token!), workspaceId);
    return authService.me(authService.requireScope(token));
  },
};
