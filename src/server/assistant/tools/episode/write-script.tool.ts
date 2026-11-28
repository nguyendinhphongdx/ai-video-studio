import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode } from '../util';

const Input = z.object({ episodeId: z.string(), discardWork: z.boolean().default(false).describe('true khi người dùng đã xác nhận bỏ ảnh/giọng/duyệt đang có để viết lại từ đầu') });
const Output = z.object({ queued: z.literal(true) });

export class WriteScript extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'write_script';
  readonly title = 'AI viết kịch bản';
  readonly description = 'Giao cho AI viết (hoặc viết lại) kịch bản của một video theo skill, tri thức và giọng văn của kênh (ba bước: dựng mạch chuyện, viết cảnh theo mạch, làm mượt lời đọc; tốn ba lượt gọi AI, chạy nền 30-90 giây). Viết lại cả kịch bản thay các cảnh bằng cảnh mới nên ẢNH, GIỌNG và TRẠNG THÁI DUYỆT của cảnh cũ mất (chỉ cảnh giống hệt được giữ). Nếu video đã có ảnh/giọng/cảnh đã duyệt, chỉ gọi khi người dùng xác nhận rõ muốn làm lại từ đầu (discardWork=true); thay đổi một phần thì dùng revise_script hoặc edit_scene.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId }: z.infer<typeof Input>, ctx: ToolContext) {
    return `AI viết kịch bản cho video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, discardWork }: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await ownEpisode(ctx, episodeId);
    const done = v.episode.scenes.filter((s) => s.approved || s.assets.imagePath || s.assets.voicePath).length;
    if (done && !discardWork) {
      throw new UserFacingError(`Video này đã có công sức ở ${done}/${v.episode.scenes.length} cảnh (ảnh, giọng hoặc đã duyệt). Viết lại cả kịch bản sẽ làm mất chúng. Hỏi người dùng có chắc muốn làm lại từ đầu không; nếu chỉ muốn đổi một phần thì dùng revise_script (giữ cảnh không đổi) hoặc edit_scene. Chỉ gọi lại với discardWork=true sau khi họ xác nhận.`);
    }
    await episodeService.requestScript(episodeId);
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker viết kịch bản. Dùng get_episode sau ít giây để xem kết quả.';
  }
}
