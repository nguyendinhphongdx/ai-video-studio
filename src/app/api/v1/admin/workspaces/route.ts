import { route } from '@/server/http/route';
import { authService } from '@/server/modules/auth/auth.service';

/** Every workspace (system admin). */
export const GET = route(() => authService.allWorkspaces());
