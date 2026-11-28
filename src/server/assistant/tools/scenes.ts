// Arranging scenes and going back to an earlier picture: what the director screen does by hand.
import { z } from 'zod';

import { defineTool } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { newId } from '@/core/domain/ids';
import { episodeService } from '@/server/modules/episode/episode.service';

import { scriptInput } from './episodes';
import { asJson, ownEpisode } from './util';

async function ownScene(ctx: Parameters<typeof ownEpisode>[0], episodeId: string, sceneId: string) {
  const v = await ownEpisode(ctx, episodeId);
  const at = v.episode.scenes.findIndex((s) => s.id === sceneId);
  const scene = v.episode.scenes[at];
  if (!scene) throw new UserFacingError('Không tìm thấy cảnh này trong video.');
  if (scene.locked) throw new UserFacingError('Cảnh này bị khoá theo series, không sửa được.');
  return { v, scene, at };
}

const Target = z.object({ episodeId: z.string(), sceneId: z.string() });

export const moveScene = defineTool({
  name: 'move_scene',
  description: 'Chuyển một cảnh đến ngay sau cảnh afterSceneId (cùng phần của khung video). Bỏ trống afterSceneId để đưa lên đầu phần đó. Ảnh, giọng và duyệt được giữ.',
  risk: 'write',
  schema: Target.extend({ afterSceneId: z.string().optional() }),
  summarize: () => 'Đổi thứ tự cảnh',
  async run({ episodeId, sceneId, afterSceneId }, ctx) {
    const { v, scene } = await ownScene(ctx, episodeId, sceneId);
    const rest = v.episode.scenes.filter((s) => s.id !== sceneId);
    const after = afterSceneId ? rest.findIndex((s) => s.id === afterSceneId) : -1;
    if (afterSceneId && rest[after]?.slotId !== scene.slotId) throw new UserFacingError('afterSceneId phải là một cảnh cùng phần (slot) với cảnh đang chuyển.');
    const first = rest.findIndex((s) => s.slotId === scene.slotId && !s.locked);
    const where = afterSceneId ? after + 1 : first >= 0 ? first : v.episode.scenes.indexOf(scene);
    rest.splice(where, 0, scene);
    await episodeService.saveScript(episodeId, scriptInput(v, rest));
    return { ok: true, message: `Đã chuyển cảnh thành cảnh số ${where + 1}.` };
  },
});

export const duplicateScene = defineTool({
  name: 'duplicate_scene',
  description: 'Nhân đôi một cảnh (lời đọc, thuộc tính, chỉnh tay), đặt ngay sau nó. Bản sao cần tạo lại ảnh/giọng nếu cảnh gốc có.',
  risk: 'write',
  schema: Target,
  summarize: () => 'Nhân đôi một cảnh',
  async run({ episodeId, sceneId }, ctx) {
    const { v, scene, at } = await ownScene(ctx, episodeId, sceneId);
    const copy = { ...scene, id: newId() };
    const scenes = [...v.episode.scenes];
    scenes.splice(at + 1, 0, copy);
    await episodeService.saveScript(episodeId, scriptInput(v, scenes));
    return { ok: true, message: `Đã nhân đôi, bản sao có id ${copy.id}.` };
  },
});

export const listScenePictures = defineTool({
  name: 'list_scene_pictures',
  description: 'Các ảnh đã từng vẽ cho một cảnh (mới nhất trước), kèm ảnh nào đang dùng. Bạn không nhìn thấy nội dung ảnh.',
  risk: 'read',
  schema: Target,
  summarize: () => 'Xem các ảnh cũ của cảnh',
  async run({ episodeId, sceneId }, ctx) {
    await ownEpisode(ctx, episodeId);
    const pictures = await episodeService.scenePictures(episodeId, sceneId);
    return { ok: true, message: asJson(pictures.map((p, i) => ({ n: i + 1, name: p.name, current: p.current }))) };
  },
});

export const useScenePicture = defineTool({
  name: 'use_scene_picture',
  description: 'Dùng lại một ảnh đã vẽ trước đó cho cảnh (name lấy từ list_scene_pictures). Không tốn tiền.',
  risk: 'write',
  schema: Target.extend({ name: z.string() }),
  summarize: () => 'Dùng lại một ảnh cũ',
  async run({ episodeId, sceneId, name }, ctx) {
    await ownScene(ctx, episodeId, sceneId);
    await episodeService.useScenePicture(episodeId, sceneId, name);
    return { ok: true, message: 'Đã dùng lại ảnh. Cảnh cần duyệt lại.' };
  },
});

export const sceneTools = [moveScene, duplicateScene, listScenePictures, useScenePicture];
