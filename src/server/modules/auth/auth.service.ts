// Sign-up, log-in, sessions. Passwords use scrypt (node:crypto); session tokens are random and stored hashed.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

import { newId } from '@/core/domain/ids';
import { ctx, makeContext, requireAdmin, runWithContext, type RequestContext } from '@/server/context';
import { ApiError } from '@/server/http/api-error';

import { authRepository } from './auth.repository';
import type { LogInInput, MeView, SignUpInput, User, Workspace } from './auth.types';

const scrypt = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'avs_session';
export const SESSION_DAYS = 30;

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
async function startSession(userId: string, workspaceId: string | null): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  await authRepository.insertSession({ tokenHash: sha256(token), userId, workspaceId, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString() });
  return token;
}

const publicUser = (u: User & { passwordHash?: string }): User => ({ id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin, createdAt: u.createdAt });

export const authService = {
  /**
   * Creates the account and its own workspace (the person is its owner). The very first account becomes the system
   * admin; its workspace may use the shared AI keys (which are the admin's own).
   */
  async signUp(input: SignUpInput): Promise<{ token: string; user: User }> {
    if (await authRepository.userByEmail(input.email)) throw new ApiError(409, 'conflict', 'Email này đã có tài khoản. Hãy đăng nhập.');
    const now = new Date().toISOString();
    const first = await authRepository.userCount() === 0;
    const user: User = { id: newId(), email: input.email, name: input.name, isAdmin: first, createdAt: now };
    const workspace: Workspace = { id: newId(), name: input.workspaceName || (first ? 'Studio chính' : `Workspace của ${input.name}`), usesSharedKeys: first, userId: user.id, createdAt: now };
    await authRepository.insertUser({ ...user, passwordHash: await hashPassword(input.password) });
    await authRepository.insertWorkspace(workspace);
    await authRepository.insertMembership({ workspaceId: workspace.id, userId: user.id, role: 'owner', createdAt: now });
    if (first) await authRepository.adoptOrphans(workspace.id, user.id);
    return { token: await startSession(user.id, workspace.id), user };
  },

  async logIn(input: LogInInput): Promise<{ token: string; user: User }> {
    const u = await authRepository.userByEmail(input.email);
    // Same message whether the email exists or not, and a hash is always computed (no timing hint).
    const ok = await verifyPassword(input.password, u?.passwordHash ?? 'scrypt$00$00');
    if (!u || !ok) throw new ApiError(401, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.');
    await authRepository.deleteExpiredSessions(new Date().toISOString());
    return { token: await startSession(u.id, (await authRepository.workspacesOf(u.id))[0]?.id ?? null), user: publicUser(u) };
  },

  async logOut(token: string | undefined) {
    if (token) await authRepository.deleteSession(sha256(token));
  },

  /** The guard's check: the context of a session token, or null when it is missing, unknown or expired. */
  async authenticate(token: string | undefined): Promise<RequestContext | null> {
    if (!token) return null;
    const s = await authRepository.session(sha256(token));
    if (!s || s.expires_at <= new Date().toISOString()) return null;
    const user = await authRepository.userById(s.user_id);
    if (!user) return null;
    const all = await authRepository.workspacesOf(user.id);
    // The session's workspace if the person still belongs to it, else their first one.
    const current = all.find((w) => w.id === s.workspace_id) ?? all[0];
    if (!current) return null;
    const { role, ...workspace } = current;
    return makeContext(publicUser(user), workspace, role, token);
  },

  /**
   * The context a worker job (or outbox event) runs in: its workspace, acting as the person who started it (or the
   * workspace's first owner when that person is gone). Null when the workspace no longer exists.
   */
  async contextFor(workspaceId: string | null, userId: string | null): Promise<RequestContext | null> {
    const workspace = workspaceId ? await authRepository.workspaceById(workspaceId) : null;
    if (!workspace) return null;
    const actor = (userId && await authRepository.roleIn(workspace.id, userId) ? userId : null) ?? await authRepository.ownerOf(workspace.id);
    const user = actor ? await authRepository.userById(actor) : null;
    if (!user) return null;
    return makeContext(publicUser(user), workspace, await authRepository.roleIn(workspace.id, user.id) ?? 'member');
  },

  /** The signed-in person, their current workspace and every workspace they belong to. */
  async me(): Promise<MeView> {
    const { user, workspace, role } = ctx();
    return { user, workspace, role, workspaces: await authRepository.workspacesOf(user.id) };
  },

  /** The system admin's list of every workspace. */
  async allWorkspaces() {
    requireAdmin();
    return await authRepository.allWorkspaces();
  },

  /** The system admin lets a workspace fall back to the shared AI keys, or stops it. */
  async setSharedKeys(workspaceId: string, allowed: boolean) {
    requireAdmin();
    if (!await authRepository.setSharedKeys(workspaceId, allowed)) throw new ApiError(404, 'not_found', 'Không tìm thấy workspace');
    return await authRepository.allWorkspaces();
  },

  /** Moves the current session to another workspace the person belongs to. */
  async switchWorkspace(workspaceId: string): Promise<MeView> {
    const { user, sessionToken } = ctx();
    if (!sessionToken || !(await authRepository.workspacesOf(user.id)).some((w) => w.id === workspaceId)) throw new ApiError(404, 'not_found', 'Không tìm thấy workspace');
    await authRepository.setSessionWorkspace(sha256(sessionToken), workspaceId);
    const next = (await authService.authenticate(sessionToken))!;
    return runWithContext(next, () => authService.me());
  },
};
