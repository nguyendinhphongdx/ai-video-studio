// Who may download a generated file: the media route serves a path only when the current workspace owns it.
import { db } from '@/server/db';
import { ws } from '@/server/http/scope';
import { channelRepository } from '@/server/modules/channel/channel.repository';
import { episodeRepository } from '@/server/modules/episode/episode.repository';

/**
 * True when the media-relative path belongs to the current workspace:
 * - episodes/<episodeId>/… and channels/<channelId>/…: that episode or channel is in the workspace;
 * - series-characters/<workspaceId>/…: the workspace's own folder;
 * - series-characters/<file> (made before workspaces): a series of this workspace uses the file;
 * - tts-preview/…: shared voice samples of fixed text, open to anyone signed in.
 */
export function canReadMedia(rel: string): boolean {
  const [top, owner, rest] = rel.split('/');
  if (!top || !owner) return false;
  if (top === 'episodes') return episodeRepository.find(owner) !== null;
  if (top === 'channels') return channelRepository.find(owner) !== null;
  if (top === 'tts-preview') return true;
  if (top === 'series-characters') {
    if (rest) return owner === ws();
    // LIKE wildcards never appear in a generated file name; refuse them so a crafted path cannot match broadly.
    if (/[%_\\]/.test(rel)) return false;
    const used = db().prepare('SELECT 1 FROM series_versions WHERE workspace_id = ? AND bible LIKE ? LIMIT 1').get(ws(), `%${rel}%`);
    return used !== undefined;
  }
  return false;
}
