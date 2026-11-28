import { publicRoute } from '@/server/http/route';
import { withSession } from '@/server/http/session-cookie';
import { parseJsonBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/auth.service';
import { SignUpInput } from '@/server/modules/auth/auth.types';

export const POST = publicRoute(async (req) => {
  const { token, user } = await authService.signUp(await parseJsonBody(req, SignUpInput));
  return withSession(req, { user }, token);
});
