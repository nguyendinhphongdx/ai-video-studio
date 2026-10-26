import { route } from '@/server/http/route';
import { toolService } from '@/server/modules/tool/tool.service';

export const GET = route(async () => toolService.list());
