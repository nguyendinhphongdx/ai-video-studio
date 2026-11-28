import { ListSeries } from './list-series.tool';
import { GetSeries } from './get-series.tool';
import { CreateSeries } from './create-series.tool';
import { UpdateSeries } from './update-series.tool';
import { AddSeriesEpisodes } from './add-series-episodes.tool';

export const seriesTools = [new ListSeries(), new GetSeries(), new CreateSeries(), new UpdateSeries(), new AddSeriesEpisodes()];
