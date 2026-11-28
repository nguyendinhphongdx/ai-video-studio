import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { customPoseKey, MAX_CUSTOM_POSES } from '@/core/character/expressions';
import { findCharacter } from '@/core/character/roster';
import { UserFacingError } from '@/core/domain/errors';
import { characterService } from '@/server/modules/series/character.service';

import { bibleOf, Id, SeriesId } from './shared';

const Input = z.object({ seriesId: SeriesId, characterId: Id, actionId: Id, description: z.string().max(300).default('') });
const Output = z.object({ actionId: z.string(), removed: z.boolean() });

export class SaveCharacterAction extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'save_character_action';
  readonly title = 'Lưu hành động riêng';
  readonly description = 'Thêm, sửa hoặc xoá một hành động riêng của nhân vật chính đầu tiên (các nhân vật khác chưa có hành động riêng). description tả tư thế để vẽ (tiếng Anh vẽ chuẩn hơn); bỏ trống = xoá.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ characterId, actionId, description }: z.infer<typeof Input>) {
    return `${description ? 'Lưu' : 'Xoá'} hành động ${actionId} của ${characterId}`;
  }

  protected async execute({ seriesId, characterId, actionId, description }: z.infer<typeof Input>, ctx: ToolContext) {
    if (!findCharacter(await bibleOf(ctx, seriesId), characterId).hero) throw new UserFacingError('Hiện chỉ nhân vật chính đầu tiên có hành động riêng.');
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
    return { actionId, removed: !text };
  }

  present({ actionId, removed }: z.infer<typeof Output>) {
    return removed ? `Đã xoá hành động "${actionId}".` : `Đã lưu hành động "${actionId}". Ảnh của nó chưa vẽ.`;
  }
}
