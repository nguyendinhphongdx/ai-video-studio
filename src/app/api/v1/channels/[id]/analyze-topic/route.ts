import { route } from '@/server/http/route';
import { parseJsonBody } from '@/server/http/validate';
import { episodeService } from '@/server/modules/episode/episode.service';
import { AnalyzeTopicInput } from '@/server/modules/episode/episode.types';

/** Looks at a typed topic against the channel's story (one AI call, nothing is created). */
export const POST = route<{ id: string }>(async (req, { id }) => await episodeService.analyzeTopic(id, (await parseJsonBody(req, AnalyzeTopicInput)).topic));
