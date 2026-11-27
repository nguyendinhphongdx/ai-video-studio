import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { settingsService } from '@/server/modules/settings/settings.service';
import { LlmSettingsInputSchema } from '@/server/modules/settings/settings.types';

/** The system's shared writing-model connection (admin). */
export const GET = route(() => settingsService.shared.publicLlm());
export const PUT = route(async (req) => settingsService.shared.saveLlm(await parseJsonBody(req, LlmSettingsInputSchema)));
