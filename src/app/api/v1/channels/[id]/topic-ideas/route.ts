import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

/** Next-video ideas for the channel (one AI call, nothing is created). */
export const POST = route<{ id: string }>(async (_req, { id }) => await episodeService.topicIdeas(id));
