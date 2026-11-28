import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ episodeId: z.string() });

export class DeleteEpisode extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'delete_episode';
  readonly title = 'Xoá video';
  readonly description = 'Xoá hẳn một video cùng ảnh, giọng và bản dựng của nó.';
  readonly risk = 'destructive';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Xoá video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    await episodeService.remove(episodeId);
    return { episodeId };
  }

  present() {
    return 'Đã xoá video.';
  }
}
