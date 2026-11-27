import { NextResponse, type NextRequest } from 'next/server';

import { authService, SESSION_COOKIE } from '@/server/modules/auth/auth.service';

import { apiErrorResponse } from './api-error';
import { runInScope } from './scope';

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a Route Handler: requires a signed-in session (401 otherwise) and runs the handler inside that person's
 * workspace scope, awaits params, returns JSON, maps every thrown error to the API error shape.
 */
export function route<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const scope = authService.requireScope(req.cookies.get(SESSION_COOKIE)?.value);
      const result = await runInScope(scope, async () => handler(req, await ctx.params));
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return apiErrorResponse(err, new URL(req.url).pathname);
    }
  };
}

/** Like `route`, without the session: only for signing up, signing in and other pages a signed-out person needs. */
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
