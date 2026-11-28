import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { removeCharacter as removed } from '@/core/character/roster';
import { characterService } from '@/server/modules/series/character.service';

import { bibleOf, Id, SeriesId } from './shared';

const Input = z.object({ seriesId: SeriesId, id: Id });
const Output = z.object({ id: z.string() });

export class RemoveCharacter extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'remove_character';
  readonly title = 'Xoá nhân vật hoặc đạo cụ';
  readonly description = 'Xoá một nhân vật hoặc đạo cụ khỏi series (phụ kiện của nhân vật đó thành đạo cụ chung). Tập đã viết giữ bản series cũ nên vẫn dựng được.';
  readonly risk = 'destructive';
  readonly input = Input;
  readonly output = Output;

  summarize({ id }: z.infer<typeof Input>) {
    return `Xoá nhân vật hoặc đạo cụ ${id}`;
  }

  protected async execute({ seriesId, id }: z.infer<typeof Input>, ctx: ToolContext) {
    await bibleOf(ctx, seriesId);
    await characterService.edit(seriesId, (b) => removed(b, id));
    return { id };
  }

  present({ id }: z.infer<typeof Output>) {
    return `Đã xoá "${id}".`;
  }
}
