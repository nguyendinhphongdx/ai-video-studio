import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { episodeLabel, ownEpisode, scriptInput } from '../util';

const Input = z.object({ episodeId: z.string(), sceneId: z.string(), request: z.string().max(600).default('') });
const Output = z.object({ note: z.string(), imageStale: z.boolean(), voiceStale: z.boolean() });

export class AiFixScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'ai_fix_scene';
  readonly title = 'AI sửa một cảnh';
  readonly description = 'Nhờ AI chuyên sửa cảnh viết lại MỘT cảnh rồi lưu: để trống request thì viết lại mô tả ảnh, nhân vật, cảm xúc, động tác cho khớp lời đọc; có request thì sửa đúng điều đó (lời đọc, ai đứng đâu, to nhỏ, không khí...). Ưu tiên công cụ này khi người dùng chê hình không khớp lời hoặc muốn ghép lại nhân vật. Sau đó cần tạo lại ảnh/giọng đã lỗi thời (generate_scene_assets, tốn tiền, hỏi trước).';
  readonly risk = 'write';
  // It calls a model while it runs, which a web request must not do.
  override readonly surfaces = ['assistant'] as const;
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, request }: z.infer<typeof Input>, ctx: ToolContext) {
    return `AI sửa một cảnh của video ${await episodeLabel(ctx, episodeId)}: ${request || 'viết hình cho khớp lời đọc'}`;
  }

  protected async execute({ episodeId, sceneId, request }: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await ownEpisode(ctx, episodeId);
    const fix = await episodeService.suggestSceneFix(episodeId, sceneId, { request });
    const scenes = v.episode.scenes.map((s) => (s.id === sceneId ? { ...s, block: fix.block, narration: fix.narration, props: fix.props } : s));
    const after = await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    const assets = after.assets[sceneId];
    return { note: fix.note, imageStale: Boolean(assets?.imageStale), voiceStale: Boolean(assets?.voiceStale) };
  }

  present({ note, imageStale, voiceStale }: z.infer<typeof Output>) {
    return `${note} Đã lưu.${imageStale ? ' Ảnh cũ không còn khớp, cần vẽ lại.' : ''}${voiceStale ? ' Giọng cũ không còn khớp, cần đọc lại.' : ''}`;
  }
}
