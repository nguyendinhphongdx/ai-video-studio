import { route } from '@/server/http/route';
import { currentScope } from '@/server/http/scope';
import { authService } from '@/server/modules/auth/auth.service';

/** The signed-in person, their current workspace and every workspace they belong to. */
export const GET = route(async () => authService.me(currentScope()));
