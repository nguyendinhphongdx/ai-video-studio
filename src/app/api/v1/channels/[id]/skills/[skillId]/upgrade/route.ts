import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

/** Bring a market-installed skill up to the market's current version. */
export const POST = route<{ id: string; skillId: string }>(async (_req, { id, skillId }) => await skillService.upgrade(id, skillId));
