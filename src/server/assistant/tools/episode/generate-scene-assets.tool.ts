import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), sceneIds: z.array(z.string()).nullable().default(null), image: z.boolean().default(true), voice: z.boolean().default(true), force: z.boolean().default(false).describe('true = làm lại cả khi ảnh/giọng hiện tại vẫn khớp cảnh (khi người dùng bảo tạo lại, đổi ảnh khác)') });
const Output = z.object({ queued: z.literal(true) });

export class GenerateSceneAssets extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'generate_scene_assets';
  readonly title = 'Tạo ảnh và giọng';
  readonly description = 'Tạo ảnh AI và/hoặc giọng đọc cho các cảnh (sceneIds; bỏ trống = mọi cảnh). Chỉ tạo phần còn thiếu hoặc lỗi thời. LUÔN gọi MỘT lần cho cả video (không gọi từng cảnh) và báo chi phí ước tính (estimate_cost) trước. Tốn tiền ảnh/giọng, chạy nền. Cảnh được tạo lại sẽ mất trạng thái duyệt.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, sceneIds, image, voice, force }: z.infer<typeof Input>, ctx: ToolContext) {
    return `${force ? 'Làm lại' : 'Tạo'} ${[image && 'ảnh', voice && 'giọng'].filter(Boolean).join(' và ')} cho ${sceneIds ? `${sceneIds.length} cảnh` : 'mọi cảnh'} của video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, sceneIds, image, voice, force }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownEpisode(ctx, episodeId);
    await episodeService.requestAssets(episodeId, { sceneIds, image, voice, force });
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker tạo. Dùng get_episode để kiểm tra khi cần (cột image/voice của từng cảnh).';
  }
}
