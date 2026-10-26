import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';
import { ApprovalInput } from '@/server/modules/episode/episode.types';

/** Approve or withdraw approval of scenes (sceneIds null = all). */
export const POST = route<{ id: string }>(async (req, { id }) => episodeService.setApproval(id, await parseJsonBody(req, ApprovalInput)));
