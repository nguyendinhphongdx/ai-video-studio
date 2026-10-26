import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { settingsService } from '@/server/modules/settings/settings.service';
import { ImageSettingsInputSchema } from '@/server/modules/settings/settings.types';

export const GET = route(() => settingsService.publicImage());
export const PUT = route(async (req) => settingsService.saveImage(await parseJsonBody(req, ImageSettingsInputSchema)));
