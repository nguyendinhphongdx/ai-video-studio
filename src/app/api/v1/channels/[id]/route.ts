import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { channelService } from '@/server/modules/channel/channel.service';
import { ChannelInput } from '@/server/modules/channel/channel.types';

type P = { id: string };
export const GET = route<P>(async (_req, { id }) => await channelService.get(id));
export const PUT = route<P>(async (req, { id }) => await channelService.update(id, await parseJsonBody(req, ChannelInput)));
export const DELETE = route<P>(async (_req, { id }) => await channelService.remove(id));
