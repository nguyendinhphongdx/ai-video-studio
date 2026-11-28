import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { episodeService } from '@/server/modules/episode/episode.service';

import { asJson, ownSeries } from '../util';

const Input = z.object({ seriesId: z.string() });
const Output = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  skillId: z.string(),
  bible: z.unknown(),
  publish: z.unknown(),
  format: z.array(z.object({ id: z.string(), name: z.string(), fill: z.string(), when: z.unknown(), blocks: z.array(z.string()), scenes: z.unknown() })),
  episodes: z.array(z.object({ id: z.string(), number: z.number().nullable(), topic: z.string(), goal: z.string(), status: z.string() })),
});

export class GetSeries extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'get_series';
  readonly title = 'Xem một series';
  readonly description = 'Xem một series: bible, mẫu đăng bài, khung một tập (các khe) và lộ trình các tập (số, chủ đề, trạng thái, id).';
  readonly risk = 'read';
  readonly input = Input;
  readonly output = Output;

  summarize({ seriesId }: z.infer<typeof Input>) {
    return `Xem series ${seriesId}`;
  }

  protected async execute({ seriesId }: z.infer<typeof Input>, ctx: ToolContext) {
    const s = await ownSeries(ctx, seriesId);
    const eps = await episodeService.list({ seriesId });
    return {
      id: s.id, name: s.name, version: s.currentVersion, skillId: s.rules.skillId, bible: s.rules.bible, publish: s.rules.publish,
      format: s.rules.format.slots.map((x) => ({ id: x.id, name: x.name, fill: x.fill, when: x.when, blocks: x.blocks, scenes: x.scenes })),
      episodes: eps.map((v) => ({ id: v.episode.id, number: v.episode.number, topic: v.episode.topic, goal: v.episode.goal, status: v.episode.status })),
    };
  }

  present(output: z.infer<typeof Output>) {
    return asJson(output, 9000);
  }
}
