import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { episodeService } from '@/server/modules/episode/episode.service';
import { toolCatalog } from '@/tools/registry';

import { episodeLabel, ownEpisode, scriptInput } from '../util';

const Input = z.object({ episodeId: z.string(), block: z.string(), narration: z.string().min(1).max(600), props: z.record(z.string(), z.unknown()).default({}), afterSceneId: z.string().optional(), slotId: z.string().optional() });
const Output = z.object({ sceneId: z.string(), sceneNumber: z.number() });

export class AddScene extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'add_scene';
  readonly title = 'Thêm một cảnh';
  readonly description = 'Thêm một cảnh vào video. block là khối được khe cho phép (xem get_episode/list_blocks), props là các thuộc tính của khối (thuộc tính bỏ trống lấy mặc định). Thêm sau cảnh afterSceneId, hoặc cuối khe slotId.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  async summarize({ episodeId, block }: z.infer<typeof Input>, ctx: ToolContext) {
    return `Thêm cảnh ${block} vào video ${await episodeLabel(ctx, episodeId)}`;
  }

  protected async execute({ episodeId, block, narration, props, afterSceneId, slotId }: z.infer<typeof Input>, ctx: ToolContext) {
    const v = await ownEpisode(ctx, episodeId);
    const scenes = [...v.episode.scenes];
    const after = afterSceneId ? scenes.findIndex((s) => s.id === afterSceneId) : -1;
    if (afterSceneId && after < 0) throw new UserFacingError('Không tìm thấy cảnh afterSceneId.');
    const slot = v.slots.find((x) => x.id === (slotId ?? (after >= 0 ? scenes[after]!.slotId : undefined))) ?? v.slots.find((x) => x.fill === 'ai' && x.blocks.includes(toolCatalog.block(block)?.ref ?? block));
    if (!slot || slot.fill !== 'ai') throw new UserFacingError('Không có khe nào cho phép thêm cảnh với khối này.');
    const resolved = toolCatalog.block(block);
    if (!resolved || !slot.blocks.includes(resolved.ref)) throw new UserFacingError(`Khe "${slot.name}" chỉ cho dùng: ${slot.blocks.join(', ')}.`);
    const fresh = { id: `n${crypto.randomUUID().replace(/-/g, '').slice(0, 11)}`, slotId: slot.id, block: resolved.ref, locked: false, narration, props: { ...(resolved.defaults as Record<string, unknown>), ...props }, approved: false, assets: { imagePath: null, imageHash: null, voicePath: null, voiceSeconds: null, voiceHash: null } };
    const at = after >= 0 ? after + 1 : scenes.map((s) => s.slotId).lastIndexOf(slot.id) + 1 || scenes.length;
    scenes.splice(at, 0, fresh);
    const saved = await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { sceneId: fresh.id, sceneNumber: saved.episode.scenes.findIndex((s) => s.id === fresh.id) + 1 };
  }

  present({ sceneId, sceneNumber }: z.infer<typeof Output>) {
    return `Đã thêm cảnh ${sceneNumber} (id ${sceneId}). Tạo ảnh/giọng rồi duyệt.`;
  }
}
