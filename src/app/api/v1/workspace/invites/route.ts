import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { CreateInviteInput } from '@/server/modules/workspace/workspace.types';

/** Open invites (owner). */
export const GET = route(() => workspaceService.invites());
/** A new invite link (owner); the token comes back once. */
export const POST = route(async (req) => await workspaceService.createInvite(await parseJsonBody(req, CreateInviteInput)));
