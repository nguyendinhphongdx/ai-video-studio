import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ status: z.string() });

export class RetryWork extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'retry_work';
  readonly title = 'Chạy lại việc bị lỗi';
  readonly description = 'Chạy lại việc bị lỗi gần nhất của một video (dựng video chạy tiếp từ bước lỗi). Có thể tốn tiền như lần đầu. Xem lỗi ở get_episode trước.';
  readonly risk = 'paid';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Chạy lại việc bị lỗi của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    return { status: (await episodeService.retry(episodeId)).episode.status };
  }

  present() {
    return 'Đã giao worker chạy lại. Theo dõi bằng get_episode.';
  }
}
