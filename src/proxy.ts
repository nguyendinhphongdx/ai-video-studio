// The first gate: a page request without a session cookie goes to /login. This is only an optimistic check (Next.js
// recommends it be cheap): every API route still verifies the session in the database through `route()`.
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'avs_session';
/** Pages a signed-out person may open. */
const PUBLIC_PAGES = ['/login', '/signup', '/offline'];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();
  const signedIn = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname.startsWith('/invite/');
  if (!signedIn && !isPublic) {
    const to = new URL('/login', req.url);
    if (pathname !== '/') to.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js assets and the static files a signed-out page (or the PWA) needs.
  matcher: ['/((?!_next/|favicon|icon\\.svg|logo\\.svg|manifest\\.webmanifest|sw\\.js|pwa-icon/|fonts/|audio/).*)'],
};
