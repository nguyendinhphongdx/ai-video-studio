import { z } from 'zod';

import { customPoseKey, MAX_CUSTOM_POSES, POSE_ID } from '@/core/character/expressions';
import { charactersOf, findCharacter, removeCharacter as removed, saveCharacter as saved } from '@/core/character/roster';
import { defineTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { characterService } from '@/server/modules/series/character.service';
import { usageService } from '@/server/modules/usage/usage.service';

import { asJson, ownSeries } from './util';

const Id = z.string().regex(POSE_ID).describe('Id nhân vật hoặc đạo cụ: chữ thường không dấu, số, gạch ngang, ví dụ "ly-tinh"');
const SeriesId = z.string().describe('Id series (list_series)');
const own = async (ctx: ToolContext, seriesId: string) => (await ownSeries(ctx, seriesId)).rules.bible;

export const listCharacters = defineTool({
  name: 'list_characters',
  description: 'Mọi nhân vật và đạo cụ của một series: tên, mô tả, có phải nhân vật chính, đạo cụ của ai, ảnh nào đã vẽ và còn thiếu. Gọi trước khi sửa hoặc vẽ.',
  risk: 'read',
  schema: z.object({ seriesId: SeriesId }),
  summarize: () => 'Xem nhân vật của series',
  async run({ seriesId }, ctx) {
    const bible = await own(ctx, seriesId);
    const list = charactersOf(bible).map((c) => {
      const slots = [...c.expressions, ...c.actions];
      return { id: c.id, ten: c.name, loai: c.kind === 'prop' ? 'đạo cụ' : 'nhân vật', chinh: c.main || undefined, cua: c.owner ?? undefined, moTa: c.description || undefined, daVe: slots.filter((k) => c.pictures[k]), chuaVe: slots.filter((k) => !c.pictures[k]) };
    });
    return { ok: true, message: asJson({ nhanVat: list, moTaChung: bible.characters || undefined, hanhDongRieng: bible.customPoses }, 14000) };
  },
});

export const saveCharacter = defineTool({
  name: 'save_character',
  description: 'Tạo nhân vật hoặc đạo cụ mới, hoặc sửa tên, mô tả, đánh dấu "Chính", loại, và chủ của đạo cụ (owner = id nhân vật; null = đạo cụ chung). Chỉ truyền trường cần đổi. Mô tả dùng để vẽ ảnh nên tả ngoại hình cụ thể (tuổi, tóc, trang phục, màu). Mỗi lần lưu là một bản series mới; tập đã viết giữ bản cũ.',
  risk: 'write',
  schema: z.object({ seriesId: SeriesId, id: Id, name: z.string().max(60).optional(), description: z.string().max(400).optional(), main: z.boolean().optional(), kind: z.enum(['character', 'prop']).optional(), owner: Id.nullable().optional() }),
  summarize: (a) => `Lưu ${a.kind === 'prop' ? 'đạo cụ' : 'nhân vật'} ${a.name ?? a.id}`,
  async run({ seriesId, id, ...patch }, ctx) {
    await own(ctx, seriesId);
    const s = await characterService.edit(seriesId, (b) => saved(b, id, patch));
    return { ok: true, message: `Đã lưu "${findCharacter(s.rules.bible, id).name}" (series bản ${s.currentVersion}). Tập đã viết chỉ thấy thay đổi sau khi cập nhật theo series mới.` };
  },
});

export const saveCharacterAction = defineTool({
  name: 'save_character_action',
  description: 'Thêm, sửa hoặc xoá một hành động riêng của nhân vật chính đầu tiên (các nhân vật khác chưa có hành động riêng). description tả tư thế để vẽ (tiếng Anh vẽ chuẩn hơn); bỏ trống = xoá.',
  risk: 'write',
  schema: z.object({ seriesId: SeriesId, characterId: Id, actionId: Id, description: z.string().max(300).default('') }),
  summarize: (a) => `${a.description ? 'Lưu' : 'Xoá'} hành động ${a.actionId} của ${a.characterId}`,
  async run({ seriesId, characterId, actionId, description }, ctx) {
    if (!findCharacter(await own(ctx, seriesId), characterId).hero) throw new UserFacingError('Hiện chỉ nhân vật chính đầu tiên có hành động riêng.');
    const text = description.trim();
    if (text && text.length < 3) throw new UserFacingError('Mô tả hành động quá ngắn.');
    await characterService.edit(seriesId, (b) => {
      const poses = { ...b.customPoses };
      const sprites = { ...b.characterSprites };
      // A changed description needs a new drawing.
      if (poses[actionId] !== text) delete sprites[customPoseKey(actionId)];
      if (text) poses[actionId] = text;
      else delete poses[actionId];
      if (Object.keys(poses).length > MAX_CUSTOM_POSES) throw new UserFacingError(`Tối đa ${MAX_CUSTOM_POSES} hành động riêng.`);
      return { ...b, customPoses: poses, characterSprites: sprites };
    });
    return { ok: true, message: text ? `Đã lưu hành động "${actionId}". Ảnh của nó chưa vẽ.` : `Đã xoá hành động "${actionId}".` };
  },
});

export const removeCharacter = defineTool({
  name: 'remove_character',
  description: 'Xoá một nhân vật hoặc đạo cụ khỏi series (phụ kiện của nhân vật đó thành đạo cụ chung). Tập đã viết giữ bản series cũ nên vẫn dựng được.',
  risk: 'destructive',
  schema: z.object({ seriesId: SeriesId, id: Id }),
  summarize: (a) => `Xoá nhân vật hoặc đạo cụ ${a.id}`,
  async run({ seriesId, id }, ctx) {
    await own(ctx, seriesId);
    await characterService.edit(seriesId, (b) => removed(b, id));
    return { ok: true, message: `Đã xoá "${id}".` };
  },
});

export const drawCharacter = defineTool({
  name: 'draw_character_pictures',
  description: 'Vẽ ảnh còn thiếu của một nhân vật hoặc đạo cụ (TỐN TIỀN: một ảnh mỗi ô; chạy nền, tự lưu vào series). keys lấy từ "chuaVe" của list_characters ("neutral" là ảnh chính). Chỉ vẽ đúng những gì người dùng cần; bỏ keys = vẽ mọi ô còn thiếu.',
  risk: 'paid',
  schema: z.object({ seriesId: SeriesId, characterId: Id, keys: z.array(z.string().max(40)).min(1).max(40).optional() }),
  async summarize({ seriesId, characterId, keys }, ctx) {
    await own(ctx, seriesId);
    const m = await characterService.missing(seriesId, { characterId, keys });
    const { usd } = await usageService.estimate({ images: m.keys.length, texts: [], voice: '' });
    return `Vẽ ${m.keys.length} ảnh cho ${m.character.name} (${usd == null ? 'chưa rõ giá' : `khoảng $${usd.toFixed(2)}`})`;
  },
  async run({ seriesId, characterId, keys }, ctx) {
    await own(ctx, seriesId);
    await characterService.requestDraw(seriesId, { characterId, keys });
    return { ok: true, message: 'Đã giao worker vẽ. Ảnh tự lưu vào thư viện khi xong (khoảng 20 giây mỗi ảnh).' };
  },
});

export const characterTools = [listCharacters, saveCharacter, saveCharacterAction, removeCharacter, drawCharacter];
