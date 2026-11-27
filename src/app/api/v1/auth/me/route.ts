import { route } from '@/server/http/route';
import { authService } from '@/server/modules/auth/auth.service';

/** The signed-in person, their current workspace and every workspace they belong to. */
export const GET = route(() => authService.me());
