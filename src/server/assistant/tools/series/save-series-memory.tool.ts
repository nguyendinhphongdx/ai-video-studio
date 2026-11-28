import { z } from 'zod';

import { StudioTool, type ToolContext } from '@/core/assistant/tool';
import { UserFacingError } from '@/core/domain/errors';
import { seriesService } from '@/server/modules/series/series.service';
import { EpisodeMemoryPatch } from '@/server/modules/series/series.types';

import { ownSeries } from '../util';

const Input = z.object({ seriesId: z.string(), season: z.string().max(3000).optional(), episode: EpisodeMemoryPatch.extend({ episodeId: z.string() }).optional() });
const Output = z.object({ season: z.boolean(), episode: z.boolean() });

export class SaveSeriesMemory extends StudioTool<z.infer<typeof Input>, z.infer<typeof Output>> {
  readonly name = 'save_series_memory';
  readonly title = 'Sửa bộ nhớ series';
  readonly description = 'Sửa bộ nhớ series: season là tóm tắt cả mùa (thay toàn bộ); episode thay toàn bộ ghi nhớ của một tập đã có trong get_series_memory (kèm episodeId).';
  readonly risk = 'write';
  override readonly surfaces = ['mcp'] as const;
  readonly input = Input;
  readonly output = Output;

  summarize() {
    return 'Sửa bộ nhớ series';
  }

  protected async execute({ seriesId, season, episode }: z.infer<typeof Input>, ctx: ToolContext) {
    await ownSeries(ctx, seriesId);
    if (season === undefined && !episode) throw new UserFacingError('Truyền season hoặc episode.');
    if (episode) {
      const { episodeId, ...patch } = episode;
      await seriesService.saveEpisodeMemory(seriesId, episodeId, patch);
    }
    if (season !== undefined) await seriesService.saveSeason(seriesId, season);
    return { season: season !== undefined, episode: Boolean(episode) };
  }

  present() {
    return 'Đã sửa bộ nhớ series.';
  }
}
