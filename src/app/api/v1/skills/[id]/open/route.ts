import { route } from '@/server/http/route';
import { skillService } from '@/server/modules/skill/skill.service';

export const POST = route<{ id: string }>((_req, { id }) => skillService.openInEditor(id));
