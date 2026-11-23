import { saveCharacterFile } from '@/server/adapters/media/media.service';
import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';

const TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const MAX_BYTES = 6 * 1024 * 1024;

/** Uploads one character reference picture; the series rules keep the returned path in `bible.characterAssets`. */
export const POST = route(async (req) => {
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'validation_error', 'Chọn một ảnh nhân vật');
  const ext = TYPES[file.type];
  if (!ext) throw new ApiError(400, 'validation_error', 'Ảnh nhân vật phải là PNG, JPG hoặc WEBP');
  if (file.size > MAX_BYTES) throw new ApiError(400, 'validation_error', 'Ảnh nhân vật tối đa 6MB');
  return { path: await saveCharacterFile(Buffer.from(await file.arrayBuffer()), ext) };
});
