import { NextResponse, type NextRequest } from 'next/server';

import { apiErrorResponse } from './api-error';

type Ctx<P> = { params: Promise<P> };

/** Wraps a Route Handler: awaits params, returns JSON, maps every thrown error to the API error shape. */
export function route<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const result = await handler(req, await ctx.params);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return apiErrorResponse(err, new URL(req.url).pathname);
    }
  };
}
