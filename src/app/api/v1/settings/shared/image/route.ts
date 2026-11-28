import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { settingsService } from '@/server/modules/settings/settings.service';
import { ImageSettingsInputSchema } from '@/server/modules/settings/settings.types';

/** The system's shared picture-model connection (admin). */
export const GET = route(() => settingsService.shared.publicImage());
export const PUT = route(async (req) => settingsService.shared.saveImage(await parseJsonBody(req, ImageSettingsInputSchema)));
