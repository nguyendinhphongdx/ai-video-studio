import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ queued: z.literal(true) });

export class ProduceVideo extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'produce_video';
  readonly title = 'Sản xuất video';
  readonly description = 'Sản xuất video: ghép các cảnh đã duyệt (ảnh, giọng, nhạc) thành video hoàn chỉnh. Chỉ chạy khi MỌI cảnh đã duyệt. Chạy nền vài phút.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Sản xuất (ghép) video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    await episodeService.approveScript(episodeId);
    return { queued: true as const };
  }

  present() {
    return 'Đã bắt đầu sản xuất. Video sẽ chờ duyệt ở bước Sản xuất khi xong.';
  }
}
