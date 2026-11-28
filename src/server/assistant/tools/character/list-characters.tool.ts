import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { charactersOf } from '@/core/character/roster';

import { asJson } from '../util';
import { bibleOf, SeriesId } from './shared';

const Input = z.object({ seriesId: SeriesId });
const Output = z.object({
  nhanVat: z.array(z.object({ id: z.string(), ten: z.string(), loai: z.string(), chinh: z.boolean().optional(), cua: z.string().optional(), moTa: z.string().optional(), daVe: z.array(z.string()), chuaVe: z.array(z.string()) })),
  moTaChung: z.string().optional(),
  hanhDongRieng: z.record(z.string(), z.string()).optional(),
});

export class ListCharacters extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'list_characters';
  readonly title = 'Xem nhân vật và đạo cụ';
  readonly description = 'Mọi nhân vật và đạo cụ của một series: tên, mô tả, có phải nhân vật chính, đạo cụ của ai, ảnh nào đã vẽ và còn thiếu. Gọi trước khi sửa hoặc vẽ.';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Xem nhân vật của series';
  }

  protected async execute({ seriesId }: z.infer<typeof Input>, ctx: ToolContext) {
    const bible = await bibleOf(ctx, seriesId);
    const list = charactersOf(bible).map((c) => {
      const slots = [...c.expressions, ...c.actions];
      return { id: c.id, ten: c.name, loai: c.kind === 'prop' ? 'đạo cụ' : 'nhân vật', chinh: c.main || undefined, cua: c.owner ?? undefined, moTa: c.description || undefined, daVe: slots.filter((k) => c.pictures[k]), chuaVe: slots.filter((k) => !c.pictures[k]) };
    });
    return { nhanVat: list, moTaChung: bible.characters || undefined, hanhDongRieng: bible.customPoses };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 14000);
  }
}
