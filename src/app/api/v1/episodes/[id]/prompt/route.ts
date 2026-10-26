import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

export const GET = route<{ id: string }>(async (req, { id }) => ({ prompt: await episodeService.manualPrompt(id, req.nextUrl.searchParams.get('feedback') ?? undefined) }));
