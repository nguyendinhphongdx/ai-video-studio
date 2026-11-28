import { ReorderSeriesEpisodes } from './reorder-series-episodes.tool';
import { SaveSeriesMemory } from './save-series-memory.tool';
import { GetSeriesMemory } from './get-series-memory.tool';
import { ListSeries } from './list-series.tool';
import { GetSeries } from './get-series.tool';
import { CreateSeries } from './create-series.tool';
import { UpdateSeries } from './update-series.tool';
import { AddSeriesEpisodes } from './add-series-episodes.tool';

export const seriesTools = [new ListSeries(), new GetSeries(), new CreateSeries(), new UpdateSeries(), new AddSeriesEpisodes(), new GetSeriesMemory(), new SaveSeriesMemory(), new ReorderSeriesEpisodes()];
