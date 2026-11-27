// The person and workspace a piece of server work runs for. A request sets it in `route()`; the worker sets it per
// job. Services and repositories read it instead of taking it through every call.
import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthScope } from '@/server/modules/auth/auth.types';

const store = new AsyncLocalStorage<AuthScope>();

export const runInScope = <T>(scope: AuthScope, fn: () => T): T => store.run(scope, fn);

/** The current scope; throws when code that needs a workspace runs outside one (a bug, not a user error). */
export function currentScope(): AuthScope {
  const s = store.getStore();
  if (!s) throw new Error('No workspace scope: this code must run inside a request or a job');
  return s;
}

export const maybeScope = (): AuthScope | undefined => store.getStore();
