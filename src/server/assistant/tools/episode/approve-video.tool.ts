import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ status: z.string() });

export class ApproveVideo extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'approve_video';
  readonly title = 'Duyệt video';
  readonly description = 'Duyệt video đã dựng xong (đánh dấu sẵn sàng đăng). Đây là quyết định cuối của người dùng: chỉ gọi khi họ đã xem video và bảo duyệt.';
  readonly risk = 'write';
  override readonly minLevel = 'full';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Duyệt video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    return { status: (await episodeService.approveVideo(episodeId)).episode.status };
  }

  present() {
    return 'Đã duyệt video. Lấy bộ đăng bài bằng get_publish_kit.';
  }
}
