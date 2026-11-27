// The person and workspace a piece of server work runs for. A request sets it in `route()`; the worker sets it per
// job. Services and repositories read it instead of taking it through every call.
import { AsyncLocalStorage } from 'node:async_hooks';

import { authRepository } from '@/server/modules/auth/auth.repository';
import type { AuthScope } from '@/server/modules/auth/auth.types';

const store = new AsyncLocalStorage<AuthScope>();

export const runInScope = <T>(scope: AuthScope, fn: () => T): T => store.run(scope, fn);

/**
 * Tests only (VITEST is set): service tests call code directly, outside any request, so they get one test account and
 * workspace in their throw-away database, made on first use. Never active in the app or the worker.
 */
function testScope(): AuthScope | undefined {
  if (!process.env.VITEST) return undefined;
  const g = globalThis as { __avsTestScope?: AuthScope };
  if (g.__avsTestScope) return g.__avsTestScope;
  const at = new Date().toISOString();
  const user = { id: 'test-user', email: 'test@local', name: 'Test', isAdmin: true, createdAt: at };
  const workspace = { id: 'test-ws', name: 'Test', usesSharedKeys: true, userId: user.id, createdAt: at };
  if (!authRepository.userById(user.id)) {
    authRepository.insertUser({ ...user, passwordHash: 'scrypt$00$00' });
    authRepository.insertWorkspace(workspace);
    authRepository.insertMembership({ workspaceId: workspace.id, userId: user.id, role: 'owner', createdAt: at });
  }
  g.__avsTestScope = { user, workspace, role: 'owner' };
  return g.__avsTestScope;
}

/** The current scope; throws when code that needs a workspace runs outside one (a bug, not a user error). */
export function currentScope(): AuthScope {
  const s = store.getStore() ?? testScope();
  if (!s) throw new Error('No workspace scope: this code must run inside a request or a job');
  return s;
}

export const maybeScope = (): AuthScope | undefined => store.getStore() ?? testScope();

/** The current workspace id: every repository filters by it. */
export const ws = (): string => currentScope().workspace.id;
/** Who is acting: stored on every row a repository inserts. */
export const uid = (): string => currentScope().user.id;
