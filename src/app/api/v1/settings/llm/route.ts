import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { settingsService } from '@/server/modules/settings/settings.service';
import { LlmSettingsInputSchema } from '@/server/modules/settings/settings.types';

export const GET = route(() => settingsService.publicLlm());
export const PUT = route(async (req) => settingsService.saveLlm(await parseJsonBody(req, LlmSettingsInputSchema)));
