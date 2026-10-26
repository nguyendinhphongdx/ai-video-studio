import { route } from '@/server/http/route';
import { configService } from '@/server/modules/config/config.service';

export const GET = route(() => configService.get());
