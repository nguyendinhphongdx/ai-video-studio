import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

/** Bring a market-installed skill up to the market's current version. */
export const POST = route<{ id: string; skillId: string }>((_req, { id, skillId }) => skillService.upgrade(id, skillId));
