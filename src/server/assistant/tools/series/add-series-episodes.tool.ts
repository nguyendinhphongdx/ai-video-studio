import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { ownSeries } from '../util';
import { Roadmap } from './roadmap';

const Input = z.object({ seriesId: z.string(), episodes: Roadmap });
const Output = z.object({ added: z.array(z.object({ id: z.string(), number: z.number().nullable() })) });

export class AddSeriesEpisodes extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'add_series_episodes';
  readonly title = 'Thêm tập vào series';
  readonly description = 'Thêm các tập mới vào cuối lộ trình của series (chưa viết kịch bản). Dùng write_script để viết từng tập.';
  readonly risk = 'write';
  readonly input = Input;
  readonly output = Output;

  summarize({ seriesId, episodes }: z.infer<typeof Input>) {
    return `Thêm ${episodes.length} tập vào series ${seriesId}`;
  }

  protected async execute({ seriesId, episodes }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownSeries(ctx, seriesId);
    const added: { id: string; number: number | null }[] = [];
    for (const e of episodes) {
      const v = await episodeService.create({ channelId: ctx.channelId, seriesId, topic: e.topic, goal: e.goal, notes: '', formats: ['landscape'], music: true, sceneCount: null, planOnly: true });
      added.push({ id: v.episode.id, number: v.episode.number });
    }
    return { added };
  }

  present({ added }: z.infer<typeof Output>) {
    return `Đã thêm: ${added.map((e) => `tập ${e.number} (id ${e.id})`).join(', ')}.`;
  }
}
