import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), sceneIds: z.array(z.string()).nullable().default(null), approved: z.boolean().default(true) });
const Output = z.object({ approved: z.boolean(), approvedScenes: z.number(), totalScenes: z.number() });

export class ApproveScenes extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'approve_scenes';
  readonly title = 'Duyệt cảnh';
  readonly description = 'Duyệt (approved=true) hoặc bỏ duyệt các cảnh (sceneIds; bỏ trống = mọi cảnh). Chỉ duyệt được cảnh đã có ảnh và giọng khớp nội dung hiện tại. Khi mọi cảnh đã duyệt mới sản xuất được.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, sceneIds, approved }: z.infer<typeof Input>, ctx: ToolContext) {
    return `${approved ? 'Duyệt' : 'Bỏ duyệt'} ${sceneIds ? `${sceneIds.length} cảnh` : 'mọi cảnh'} của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, sceneIds, approved }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    const v = await episodeService.setApproval(episodeId, { sceneIds, approved });
    return { approved, approvedScenes: v.episode.scenes.filter((s) => s.approved).length, totalScenes: v.episode.scenes.length };
  }

  present({ approved, approvedScenes, totalScenes }: z.infer<typeof Output>) {
    return `Đã ${approved ? 'duyệt' : 'bỏ duyệt'}. Hiện ${approvedScenes}/${totalScenes} cảnh đã duyệt.`;
  }
}
