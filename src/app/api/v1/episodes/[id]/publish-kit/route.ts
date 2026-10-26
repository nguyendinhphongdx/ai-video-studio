import { slugify } from '@/core/domain/ids';
import { publishMarkdown } from '@/core/script/publish';
import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const { episode, renders } = await episodeService.get(id);
  return new Response(publishMarkdown(episode, renders), {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="${slugify(episode.title || episode.topic)}-dang-bai.md"` },
  });
});
