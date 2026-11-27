// The request context: who is acting, in which workspace, and what any paid call belongs to. One AsyncLocalStorage
// for the whole server, like NestJS's request scope: the API guard (`route()`) sets it for every request, the worker
// sets it for every job and outbox event. Services and repositories read it with `ctx()`; never pass the user, the
// workspace or the session through function parameters.
import { AsyncLocalStorage } from 'node:async_hooks';

import { ApiError } from '@/server/http/api-error';
import { authRepository } from '@/server/modules/auth/auth.repository';
import type { Role, User, Workspace } from '@/server/modules/auth/auth.types';

/** What a paid call (LLM, picture, voice) is booked against in the cost ledger. */
export interface UsageTags {
  channelId?: string;
  seriesId?: string;
  episodeId?: string;
  sceneId?: string;
  jobId?: string;
  threadId?: string;
  purpose?: string;
}

export interface RequestContext {
  user: User;
  workspace: Workspace;
  role: Role;
  /** Shorthands: every repository filters by `workspaceId` and stamps `userId` on what it inserts. */
  workspaceId: string;
  userId: string;
  /** The raw session token of an API request (absent in the worker). */
  sessionToken?: string;
  usage: UsageTags;
}

const g = globalThis as unknown as { __avsCtx?: AsyncLocalStorage<RequestContext> };
const store = (g.__avsCtx ??= new AsyncLocalStorage<RequestContext>());

/** Builds a context for a person acting in a workspace. */
export function makeContext(user: User, workspace: Workspace, role: Role, sessionToken?: string): RequestContext {
  return { user, workspace, role, workspaceId: workspace.id, userId: user.id, sessionToken, usage: {} };
}

/** Runs `fn` (and everything it awaits) inside the context. */
export const runWithContext = <T>(c: RequestContext, fn: () => T): T => store.run(c, fn);

/**
 * Tests only (VITEST is set): service tests call code directly, outside any request, so they get one test account and
 * workspace in their throw-away database, made on first use. Never active in the app or the worker.
 */
function testContext(): RequestContext | undefined {
  if (!process.env.VITEST) return undefined;
  const t = globalThis as { __avsTestCtx?: RequestContext };
  if (t.__avsTestCtx) return t.__avsTestCtx;
  const at = new Date().toISOString();
  const user: User = { id: 'test-user', email: 'test@local', name: 'Test', isAdmin: true, createdAt: at };
  const workspace: Workspace = { id: 'test-ws', name: 'Test', usesSharedKeys: true, userId: user.id, createdAt: at };
  if (!authRepository.userById(user.id)) {
    authRepository.insertUser({ ...user, passwordHash: 'scrypt$00$00' });
    authRepository.insertWorkspace(workspace);
    authRepository.insertMembership({ workspaceId: workspace.id, userId: user.id, role: 'owner', createdAt: at });
  }
  t.__avsTestCtx = makeContext(user, workspace, 'owner');
  return t.__avsTestCtx;
}

/** The current context; throws when code that needs one runs outside a request or a job (a bug, not a user error). */
export function ctx(): RequestContext {
  const c = store.getStore() ?? testContext();
  if (!c) throw new Error('No request context: this code must run inside an API request or a worker job');
  return c;
}

/** The context when there is one (code that also runs at start-up, outside any request). */
export const maybeCtx = (): RequestContext | undefined => store.getStore() ?? testContext();

/** Only an owner of the current workspace: its people, AI connections and budgets. */
export function requireOwner(): void {
  if (ctx().role !== 'owner') throw new ApiError(403, 'forbidden', 'Chỉ chủ workspace mới làm được việc này.');
}

/** Only the system admin: the shared AI keys, the price book, which workspaces may use the shared keys. */
export function requireAdmin(): void {
  if (!ctx().user.isAdmin) throw new ApiError(403, 'forbidden', 'Chỉ quản trị hệ thống mới làm được việc này.');
}

/** Runs `fn` with extra cost-ledger tags (a video, a job, a purpose) added to the current context. */
export function withUsage<T>(tags: UsageTags, fn: () => T): T {
  const c = ctx();
  return store.run({ ...c, usage: { ...c.usage, ...tags } }, fn);
}
