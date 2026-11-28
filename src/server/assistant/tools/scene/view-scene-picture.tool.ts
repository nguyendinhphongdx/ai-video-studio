import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import type { ChatImage } from '@/core/ports';
import { mediaUrl } from '@/server/adapters/media/media.service';
import { episodeService } from '@/server/modules/episode/episode.service';
import { linkService } from '@/server/modules/mcp/links.service';

import { callerOf } from '../mcp-link';
import { pictureAt } from '../pictures';
import { ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), sceneId: z.string(), name: z.string().optional() });
const Output = z.object({ path: z.string(), url: z.string(), expiresAt: z.string() });

export class ViewScenePicture extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'view_scene_picture';
  readonly title = 'Xem ảnh của cảnh';
  readonly description = 'Xem một ảnh của cảnh bằng mắt: trả về chính ảnh đó và một liên kết xem được trong khoảng một giờ. Bỏ name để xem ảnh đang dùng; name lấy từ list_scene_pictures.';
  readonly risk = 'read';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem ảnh của một cảnh';
  }

  protected async execute({ episodeId, sceneId, name }: z.infer<typeof Input>, ctx: ToolContext) {
    const { codeId, origin } = callerOf(ctx);
    await ownEpisode(ctx, episodeId);
    const pictures = await episodeService.scenePictures(episodeId, sceneId);
    const picture = name ? pictures.find((p) => p.name === name) : pictures.find((p) => p.current);
    if (!picture) throw new UserFacingError(name ? 'Không tìm thấy ảnh này.' : 'Cảnh này chưa có ảnh.');
    // The listed url is the media route of the same file.
    const path = picture.url.slice(mediaUrl('').length).split('/').map(decodeURIComponent).join('/');
    const link = await linkService.view(codeId, path);
    return { path, url: `${origin}/api/mcp/media/${link.token}`, expiresAt: link.expiresAt };
  }

  protected override pictures({ path }: z.infer<typeof Output>): Promise<ChatImage[]> {
    return pictureAt(path);
  }

  present({ url, expiresAt }: z.infer<typeof Output>) {
    return `Ảnh kèm theo. Liên kết xem (hết hạn ${expiresAt}): ${url}`;
  }
}
