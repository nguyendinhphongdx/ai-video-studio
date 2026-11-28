import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import type { ChatImage } from '@/core/ports';
import { linkService } from '@/server/modules/mcp/links.service';

import { callerOf } from '../mcp-link';
import { pictureAt } from '../pictures';
import { ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ videos: z.array(z.object({ format: z.string(), seconds: z.number(), url: z.string(), expiresAt: z.string() })), thumbnails: z.array(z.string()) });

export class GetVideo extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_video';
  readonly title = 'Xem video đã dựng';
  readonly description = 'Video đã dựng của một tập: mỗi khung hình một liên kết xem/tải được trong khoảng một giờ (không cần đăng nhập) và một ảnh đại diện để bạn nhìn. Bạn không xem được chuyển động hay nghe được tiếng: muốn kiểm tra từng cảnh thì dùng view_scene_picture.';
  readonly risk = 'read';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem video đã dựng';
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    const { codeId, origin } = callerOf(ctx);
    const { renders } = await ownEpisode(ctx, episodeId);
    const videos: z.infer<typeof Output>['videos'] = [];
    for (const r of renders) {
      const link = await linkService.view(codeId, r.filePath);
      videos.push({ format: r.format, seconds: Math.round(r.durationSec), url: `${origin}/api/mcp/media/${link.token}`, expiresAt: link.expiresAt });
    }
    return { videos, thumbnails: renders.flatMap((r) => (r.thumbnailPath ? [r.thumbnailPath] : [])).slice(0, 2) };
  }

  protected override async pictures({ thumbnails }: z.infer<typeof Output>): Promise<ChatImage[]> {
    return (await Promise.all(thumbnails.map(pictureAt))).flat();
  }

  present({ videos }: z.infer<typeof Output>) {
    return videos.length ? videos.map((v) => `${v.format}, ${v.seconds} giây (hết hạn ${v.expiresAt}): ${v.url}`).join('\n') : 'Video này chưa được dựng.';
  }
}
