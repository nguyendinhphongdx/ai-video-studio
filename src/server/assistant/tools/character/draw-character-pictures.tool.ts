import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { characterService } from '@/server/modules/series/character.service';
import { usageService } from '@/server/modules/usage/usage.service';

import { bibleOf, Id, SeriesId } from './shared';

const Input = z.object({ seriesId: SeriesId, characterId: Id, keys: z.array(z.string().max(40)).min(1).max(40).optional() });
const Output = z.object({ queued: z.literal(true) });

export class DrawCharacterPictures extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'draw_character_pictures';
  readonly title = 'Vẽ ảnh nhân vật';
  readonly description = 'Vẽ ảnh còn thiếu của một nhân vật hoặc đạo cụ (TỐN TIỀN: một ảnh mỗi ô; chạy nền, tự lưu vào series). keys lấy từ "chuaVe" của list_characters ("neutral" là ảnh chính). Chỉ vẽ đúng những gì người dùng cần; bỏ keys = vẽ mọi ô còn thiếu.';
  readonly risk = 'paid';
  readonly input = Input;
  readonly output = Output;

  async summarize({ seriesId, characterId, keys }: z.infer<typeof Input>, ctx: ToolContext) {
    await bibleOf(ctx, seriesId);
    const m = await characterService.missing(seriesId, { characterId, keys });
    const { usd } = await usageService.estimate({ images: m.keys.length, texts: [], voice: '' });
    return `Vẽ ${m.keys.length} ảnh cho ${m.character.name} (${usd == null ? 'chưa rõ giá' : `khoảng $${usd.toFixed(2)}`})`;
  }

  protected async execute({ seriesId, characterId, keys }: z.infer<typeof Input>, ctx: ToolContext) {
    await bibleOf(ctx, seriesId);
    await characterService.requestDraw(seriesId, { characterId, keys });
    return { queued: true as const };
  }

  present() {
    return 'Đã giao worker vẽ. Ảnh tự lưu vào thư viện khi xong (khoảng 20 giây mỗi ảnh).';
  }
}
