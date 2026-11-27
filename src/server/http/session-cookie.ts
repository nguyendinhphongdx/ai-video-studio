import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, SESSION_DAYS } from '@/server/modules/auth/auth.service';

/** Secure only over HTTPS (directly or behind a proxy), so a plain-HTTP local run can still sign in. */
const isHttps = (req: NextRequest) => new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

export function withSession(req: NextRequest, body: unknown, token: string): NextResponse {
  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isHttps(req), path: '/', maxAge: SESSION_DAYS * 86_400 });
  return res;
}

export function withoutSession(req: NextRequest): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: isHttps(req), path: '/', maxAge: 0 });
  return res;
}
