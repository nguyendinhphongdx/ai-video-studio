import { slugify } from '@/core/domain/ids';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const file = await seriesService.exportFile(id);
  return new Response(JSON.stringify(file, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${slugify(file.name)}.series.json"` },
  });
});
