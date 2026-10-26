import { z } from 'zod';

import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { SeriesFile } from '@/server/modules/series/series.types';

const Body = z.object({ channelId: z.string().min(1), file: SeriesFile });
export const POST = route(async (req) => {
  const { channelId, file } = await parseJsonBody(req, Body);
  return seriesService.importFile(channelId, file);
});
