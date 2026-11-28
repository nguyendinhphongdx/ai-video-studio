import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { findCharacter, saveCharacter as saved } from '@/core/character/roster';
import { characterService } from '@/server/modules/series/character.service';

import { bibleOf, Id, SeriesId } from './shared';

const Input = z.object({ seriesId: SeriesId, id: Id, name: z.string().max(60).optional(), description: z.string().max(400).optional(), main: z.boolean().optional(), kind: z.enum(['character', 'prop']).optional(), owner: Id.nullable().optional() });
const Output = z.object({ name: z.string(), seriesVersion: z.number() });

export class SaveCharacter extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'save_character';
  readonly title = 'Lưu nhân vật hoặc đạo cụ';
  readonly description = 'Tạo nhân vật hoặc đạo cụ mới, hoặc sửa tên, mô tả, đánh dấu "Chính", loại, và chủ của đạo cụ (owner = id nhân vật; null = đạo cụ chung). Chỉ truyền trường cần đổi. Mô tả dùng để vẽ ảnh nên tả ngoại hình cụ thể (tuổi, tóc, trang phục, màu). Mỗi lần lưu là một bản series mới; tập đã viết giữ bản cũ.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ id, name, kind }: z.infer<typeof Input>) {
    return `Lưu ${kind === 'prop' ? 'đạo cụ' : 'nhân vật'} ${name ?? id}`;
  }

  protected async execute({ seriesId, id, ...patch }: z.infer<typeof Input>, ctx: ToolContext) {
    await bibleOf(ctx, seriesId);
    const s = await characterService.edit(seriesId, (b) => saved(b, id, patch));
    return { name: findCharacter(s.rules.bible, id).name, seriesVersion: s.currentVersion };
  }

  present({ name, seriesVersion }: z.infer<typeof Output>) {
    return `Đã lưu "${name}" (series bản ${seriesVersion}). Tập đã viết chỉ thấy thay đổi sau khi cập nhật theo series mới.`;
  }
}
