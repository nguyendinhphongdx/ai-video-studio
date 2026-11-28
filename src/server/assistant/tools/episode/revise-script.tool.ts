import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), feedback: z.string().min(3).max(600) });
const Output = z.object({ queued: z.literal(true) });

export class ReviseScript extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'revise_script';
  readonly title = 'AI sửa kịch bản';
  readonly description = 'Nhờ AI sửa kịch bản hiện có theo một yêu cầu (VD "ngắn gọn hơn", "thêm 2 cảnh về con mèo"). Dùng khi yêu cầu ảnh hưởng nhiều cảnh; sửa một cảnh cụ thể thì dùng edit_scene. Tốn lượt gọi AI, chạy nền.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, feedback }: z.infer<typeof Input>, ctx: ToolContext) {
    return `AI sửa kịch bản ${await episodeLabel(ctx, episodeId)}: ${feedback}`;
  }

  protected async execute({ episodeId, feedback }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    await episodeService.revise(episodeId, feedback);
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker sửa kịch bản. Cảnh không đổi giữ nguyên ảnh, giọng và trạng thái duyệt.';
  }
}
