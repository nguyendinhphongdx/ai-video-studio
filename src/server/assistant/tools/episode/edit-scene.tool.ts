import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { isEffectId, patchTune, ToolTuneSchema, TUNE_KEY, tuneOf } from '@/core/domain/tune';
import { episodeService } from '@/server/modules/episode/episode.service';
import { toolCatalog } from '@/tools/registry';

import { episodeLabel, ownEpisode, scriptInput } from '../util';

const Input = z.object({ episodeId: z.string(), sceneId: z.string(), narration: z.string().max(600).optional(), props: z.record(z.string(), z.unknown()).optional(), tune: ToolTuneSchema.optional(), block: z.string().optional().describe('Mã khối để đổi loại cảnh, ví dụ "remotion/counter"') });
const Output = z.object({ sceneNumber: z.number() });

export class EditScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'edit_scene';
  readonly title = 'Sửa một cảnh';
  readonly description = 'Sửa MỘT cảnh của video: lời đọc (narration), các thuộc tính của khối (props, chỉ truyền thuộc tính cần đổi; xem get_episode và list_blocks), chỉnh tay (tune: bố trí, người và vật thêm, giờ xuất hiện từng lớp, chữ, giọng điệu, tiếng động; chỉ truyền mục cần đổi) và/hoặc ĐỔI LOẠI CẢNH sang khối khác mà skill cho phép (block, ví dụ từ remotion/picture sang remotion/counter; khi đổi loại hãy điền đủ props của khối mới, thuộc tính bỏ trống lấy mặc định của khối mới). Sửa xong cảnh mất trạng thái duyệt, ảnh/giọng cũ thành lỗi thời nếu mô tả ảnh hoặc lời đọc đổi. Không sửa được cảnh khoá của series.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, narration, props, block, tune }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Sửa cảnh của video ${await episodeLabel(ctx, episodeId)}: ${[block && `đổi loại thành @${block}`, narration !== undefined && 'lời đọc', props && Object.keys(props).join(', '), tune && 'chỉnh tay'].filter(Boolean).join(' + ')}`;
  }

  protected async execute({ episodeId, sceneId, narration, props, block, tune }: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await ownEpisode(ctx, episodeId);
    const scene = v.episode.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new UserFacingError('Không tìm thấy cảnh này trong video.');
    if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không sửa được.');
    // Changing the type starts from the new block's own defaults (the old block's props mean nothing to it).
    const target = block && block !== scene.block ? toolCatalog.block(block) : undefined;
    if (block && block !== scene.block && !target) throw new UserFacingError(`Khối @${block} không tồn tại. Xem list_blocks.`);
    const unknown = tune?.extras?.filter((e) => !v.cast[e.id] && !isEffectId(e.id)).map((e) => e.id);
    if (unknown?.length) throw new UserFacingError(`Chưa có ảnh cho: ${unknown.join(', ')}. Xem cast trong get_episode.`);
    const scenes = v.episode.scenes.map((s) => (s.id === sceneId ? { ...s, ...(target ? { block: target.ref } : {}), narration: narration ?? s.narration, props: target ? { ...(target.defaults as Record<string, unknown>), ...(props ?? {}) } : { ...s.props, ...(props ?? {}) } } : s));
    if (tune) {
      const edited = scenes.find((s) => s.id === sceneId)!;
      const items = new Set((await episodeService.cast(episodeId)).filter((c) => c.kind === 'item').map((c) => c.id));
      const extras = tune.extras?.map((e) => ({ ...e, kind: items.has(e.id) ? ('item' as const) : ('person' as const) }));
      const next = patchTune(tuneOf(edited.props), { ...tune, ...(extras ? { extras } : {}) });
      const { [TUNE_KEY]: _old, ...rest } = edited.props;
      edited.props = next ? { ...rest, [TUNE_KEY]: next } : rest;
    }
    const after = await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { sceneNumber: after.episode.scenes.findIndex((s) => s.id === sceneId) + 1 };
  }

  present({ sceneNumber }: z.infer<typeof Output>) {
    return `Đã sửa cảnh ${sceneNumber}. Cần tạo lại ảnh/giọng nếu nội dung liên quan đã đổi, rồi duyệt lại.`;
  }
}
