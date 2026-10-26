import { parseJsonBody } from '@/server/http/validate';
import { route } from '@/server/http/route';
import { channelService } from '@/server/modules/channel/channel.service';
import { ChannelInput } from '@/server/modules/channel/channel.types';

export const GET = route(() => channelService.list());
export const POST = route(async (req) => channelService.create(await parseJsonBody(req, ChannelInput)));
