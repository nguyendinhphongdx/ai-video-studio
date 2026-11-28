// Who may download a generated file: the media route serves a path only when the current workspace owns it.
import { and, like, sql } from 'drizzle-orm';

import { ctx } from '@/server/context';
import { one, orm, scoped } from '@/server/orm';
import { seriesVersions } from '@/server/schema';
import { channelRepository } from '@/server/modules/channel/channel.repository';
import { episodeRepository } from '@/server/modules/episode/episode.repository';

/**
 * True when the media-relative path belongs to the current workspace:
 * - episodes/<episodeId>/… and channels/<channelId>/…: that episode or channel is in the workspace;
 * - series-characters/<workspaceId>/…: the workspace's own folder;
 * - series-characters/<file> (made before workspaces): a series of this workspace uses the file;
 * - assistant/<workspaceId>/…: files people showed the assistant, in the workspace's own folder;
 * - tts-preview/…: shared voice samples of fixed text, open to anyone signed in.
 */
export async function canReadMedia(rel: string): Promise<boolean> {
  const [top, owner, rest] = rel.split('/');
  if (!top || !owner) return false;
  if (top === 'episodes') return await episodeRepository.find(owner) !== null;
  if (top === 'channels') return await channelRepository.find(owner) !== null;
  if (top === 'tts-preview') return true;
  if (top === 'assistant') return owner === ctx().workspaceId && Boolean(rest);
  if (top === 'series-characters') {
    if (rest) return owner === ctx().workspaceId;
    // LIKE wildcards never appear in a generated file name; refuse them so a crafted path cannot match broadly.
    if (/[%_\\]/.test(rel)) return false;
    const used = await orm().select({ one: sql`1` }).from(seriesVersions).where(and(scoped(seriesVersions), like(sql`${seriesVersions.bible}::text`, `%${rel}%`))).limit(1).then(one);
    return used !== undefined;
  }
  return false;
}
