import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { asJson, describeEpisode, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string() });
const Output = z.object({ id: z.string(), status: z.string(), approved: z.string(), scenes: z.array(z.object({ id: z.string(), n: z.number() }).loose()), cast: z.unknown() }).loose();

export class GetEpisode extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_episode';
  readonly title = 'Xem chi tiết một video';
  readonly description = 'Xem chi tiết một video: kịch bản từng cảnh (id, khối, lời đọc, thuộc tính), ảnh/giọng/duyệt của từng cảnh, việc đang chạy, lỗi kiểm tra tự động.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize({ episodeId }: z.infer<typeof Input>) {
    return `Xem video ${episodeId}`;
  }

  protected async execute({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    const view = await ownEpisode(ctx, episodeId);
    // Who is a person and what is a thing decides how it can be put on screen.
    return { ...describeEpisode(view), cast: await episodeService.cast(episodeId) };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 16000);
  }
}
