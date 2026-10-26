import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { seriesService } from '@/server/modules/series/series.service';
import { EpisodeMemoryPatch } from '@/server/modules/series/series.types';

export const PUT = route<{ id: string; episodeId: string }>(async (req, { id, episodeId }) => seriesService.saveEpisodeMemory(id, episodeId, await parseJsonBody(req, EpisodeMemoryPatch)));
