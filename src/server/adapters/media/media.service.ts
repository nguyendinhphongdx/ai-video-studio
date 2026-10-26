// Files the app generates (voice, clips, renders, logos) under data/media, addressed by relative paths.
import fs from 'node:fs/promises';
import path from 'node:path';

import type { MediaPort } from '@/core/ports';
import { ApiError } from '@/server/http/api-error';
import { MEDIA_DIR, PUBLIC_DIR } from '@/server/config';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};
export const mimeOf = (file: string) => MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/** Resolve a relative media path, refusing anything that escapes the media root. */
export function resolveMedia(rel: string): string {
  const abs = path.resolve(MEDIA_DIR, rel);
  if (!abs.startsWith(MEDIA_DIR + path.sep)) throw new ApiError(403, 'forbidden', 'Đường dẫn không hợp lệ');
  return abs;
}

export const mediaUrl = (rel: string) => `/api/v1/media/${rel.split(path.sep).map(encodeURIComponent).join('/')}`;

export const media: MediaPort = {
  async episodeDir(episodeId) {
    const dir = path.join(MEDIA_DIR, 'episodes', episodeId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  },
  relative: (abs) => path.relative(MEDIA_DIR, abs),
  absolute: (rel) => resolveMedia(rel),
  asset: (rel) => path.join(PUBLIC_DIR, rel),
  exists: (abs) => fs.access(abs).then(() => true, () => false),
  async dataUri(abs) {
    const buf = await fs.readFile(abs);
    return `data:${mimeOf(abs)};base64,${buf.toString('base64')}`;
  },
};

export async function removeEpisodeMedia(episodeId: string) {
  await fs.rm(path.join(MEDIA_DIR, 'episodes', episodeId), { recursive: true, force: true });
}

export async function saveChannelLogo(channelId: string, data: Buffer, ext: string): Promise<string> {
  const dir = path.join(MEDIA_DIR, 'channels', channelId);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `logo-${Date.now()}${ext}`);
  await fs.writeFile(file, data);
  return path.relative(MEDIA_DIR, file);
}
