import { ChannelInput } from '@/server/modules/channel/channel.types';
import type { channelService } from '@/server/modules/channel/channel.service';

type Channel = Awaited<ReturnType<typeof channelService.get>>;

/** The channel as the save endpoint wants it, with only the given fields replaced. */
export function channelInput(c: Channel, patch: Record<string, unknown>) {
  return ChannelInput.parse({
    name: c.name, description: c.description, font: c.font, imageStyle: c.imageStyle, introDesign: c.introDesign, outroDesign: c.outroDesign, audience: c.audience, style: c.style, voice: c.voice,
    outroText: c.outroText, subscribeText: c.subscribeText, hashtags: c.hashtags, music: c.music, palette: c.palette, defaultSkillId: c.defaultSkillId, ...patch,
  });
}
