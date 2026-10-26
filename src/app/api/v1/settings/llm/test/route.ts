import { llmService } from '@/server/adapters/llm/llm.service';
import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { LlmSettingsInputSchema } from '@/server/modules/settings/settings.types';

/** Tries the form's (unsaved) values on top of the saved ones with one tiny request. */
export const POST = route(async (req) => llmService.test(await parseJsonBody(req, LlmSettingsInputSchema)));
