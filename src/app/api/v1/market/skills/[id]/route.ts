import { route } from '@/server/http/route';
import { marketService } from '@/server/modules/skill/market.service';

export const GET = route<{ id: string }>((_req, { id }) => marketService.get(id));
