import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { assistantService } from '@/server/modules/assistant/assistant.service';

/** Keeps one file to attach to the next message of this conversation. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'validation_error', 'Chọn một tệp');
  return await assistantService.upload(id, file);
});
