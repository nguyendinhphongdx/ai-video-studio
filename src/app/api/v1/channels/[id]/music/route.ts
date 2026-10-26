import { ApiError } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { channelService } from '@/server/modules/channel/channel.service';

export const POST = route<{ id: string }>(async (req, { id }) => {
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'validation_error', 'Chọn một file nhạc');
  return channelService.setMusic(id, file);
});
