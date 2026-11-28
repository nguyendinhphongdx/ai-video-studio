import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), feedback: z.string().max(1000).default('') });
const Output = z.object({ revising: z.boolean() });

export class RejectVideo extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'reject_video';
  readonly title = 'Trả video về sửa';
  readonly description = 'Trả video đã dựng về bước sửa cảnh. Nếu truyền feedback, AI sẽ sửa kịch bản theo đó (tốn lượt gọi AI); bỏ trống thì chỉ mở lại để sửa tay.';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Trả video về sửa: ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, feedback }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    if (feedback.trim() && ctx.caller && ctx.caller.access !== 'full') throw new UserFacingError('Góp ý để AI sửa là việc tốn tiền, cần mã "Toàn quyền". Gọi lại không kèm feedback để chỉ mở lại video.');
    const v = await episodeService.rejectVideo(episodeId, feedback.trim());
    return { revising: v.job?.kind === 'revise_script' };
  }

  present({ revising }: z.infer<typeof Output>) {
    return revising ? 'Đã trả video, worker đang sửa kịch bản theo góp ý.' : 'Đã mở lại video để sửa cảnh.';
  }
}
