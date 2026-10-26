import { testImage } from '@/server/adapters/image/image.service';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { ImageSettingsInputSchema } from '@/server/modules/settings/settings.types';

/** Makes one real picture to prove the key and model work (costs a single image). */
export const POST = route(async (req) => testImage(await parseJsonBody(req, ImageSettingsInputSchema)));
