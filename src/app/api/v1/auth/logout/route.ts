import { publicRoute } from '@/server/http/route';
import { withoutSession } from '@/server/http/session-cookie';
import { authService, SESSION_COOKIE } from '@/server/modules/auth/auth.service';

export const POST = publicRoute(async (req) => {
  await authService.logOut(req.cookies.get(SESSION_COOKIE)?.value);
  return withoutSession(req);
});
