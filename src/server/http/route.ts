import { NextResponse, type NextRequest } from 'next/server';

import { runWithContext } from '@/server/context';
import { authService, SESSION_COOKIE } from '@/server/modules/auth/auth.service';

import { ApiError, apiErrorResponse } from './api-error';

type Ctx<P> = { params: Promise<P> };

/**
 * The auth guard in front of every API route that needs a signed-in person: it verifies the session cookie (401
 * otherwise), puts the request context (user, workspace, role, session) into the AsyncLocalStorage, and runs the
 * handler inside it. Services and repositories read that context with `ctx()` (src/server/context.ts).
 */
export function route<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const context = authService.authenticate(req.cookies.get(SESSION_COOKIE)?.value);
      if (!context) throw new ApiError(401, 'unauthorized', 'Bạn cần đăng nhập.');
      const result = await runWithContext(context, async () => handler(req, await ctx.params));
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return apiErrorResponse(err, new URL(req.url).pathname);
    }
  };
}

/** Like `route`, without the guard: only for signing up, signing in and signing out. */
export function publicRoute<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const result = await handler(req, await ctx.params);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return apiErrorResponse(err, new URL(req.url).pathname);
    }
  };
}
