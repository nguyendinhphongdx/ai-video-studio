import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { channelService } from '@/server/modules/channel/channel.service';
import { ChannelInput } from '@/server/modules/channel/channel.types';

type P = { id: string };
export const GET = route<P>((_req, { id }) => channelService.get(id));
export const PUT = route<P>(async (req, { id }) => channelService.update(id, await parseJsonBody(req, ChannelInput)));
export const DELETE = route<P>((_req, { id }) => channelService.remove(id));
