import { route } from '@/server/http/route';
import { episodeService } from '@/server/modules/episode/episode.service';

/** Next-video ideas for the channel (one AI call, nothing is created). */
export const POST = route<{ id: string }>((_req, { id }) => episodeService.topicIdeas(id));
