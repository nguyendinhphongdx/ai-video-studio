import { z } from 'zod';

import { SERIES_GUIDE } from '@/core/assistant/guides';
import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { seriesService } from '@/server/modules/series/series.service';

import { Roadmap } from './roadmap';

const Input = z.object({
  name: z.string().min(1).max(80),
  skillId: z.string(),
  premise: z.string().max(1000),
  host: z.string().max(200).default(''),
  catchphrases: z.array(z.string().max(200)).max(10).default([]),
  avoid: z.array(z.string().max(200)).max(30).default([]),
  instructions: z.string().max(20_000).default(''),
  hashtags: z.array(z.string().regex(/^#\S+$/)).max(10).default([]),
  titleTemplate: z.string().max(120).default('{series} | Tập {n}: {topic}'),
  roadmap: Roadmap,
});
const Output = z.object({ id: z.string(), name: z.string(), episodes: z.number(), slots: z.array(z.string()) });

export class CreateSeries extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'create_series';
  readonly title = 'Tạo series';
  readonly description = `Tạo một series mới của kênh cùng lộ trình các tập (mỗi tập chưa viết kịch bản). Khung một tập được dựng tự động từ skill đã chọn (skill phải thuộc kênh). ${SERIES_GUIDE}`;
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ name, roadmap }: z.infer<typeof Input>) {
    return `Tạo series “${name}” với ${roadmap.length} tập`;
  }

  protected async execute(a: z.infer<typeof Input>, ctx: ToolContext) {
    const tpl = await seriesService.template(ctx.channelId, a.skillId);
    const s = await seriesService.create({
      channelId: ctx.channelId,
      name: a.name,
      skillId: a.skillId,
      bible: { ...tpl.bible, premise: a.premise, host: a.host, catchphrases: a.catchphrases, avoid: a.avoid, instructions: a.instructions },
      format: tpl.format,
      publish: { title: a.titleTemplate, hashtags: a.hashtags, descriptionFooter: '' },
      roadmap: a.roadmap,
    });
    return { id: s.id, name: s.name, episodes: s.stats.total, slots: s.rules.format.slots.map((x) => x.name) };
  }

  present({ id, name, episodes, slots }: z.infer<typeof Output>) {
    return `Đã tạo series "${name}" (id ${id}) với ${episodes} tập trong lộ trình. Khung mỗi tập: ${slots.join(' → ')}.`;
  }
}
