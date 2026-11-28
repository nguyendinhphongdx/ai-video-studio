import { canReadMedia } from '@/server/adapters/media/media-access';
import { resolveMedia } from '@/server/adapters/media/media.service';
import { notFound } from '@/server/http/api-error';
import { route } from '@/server/http/route';
import { serveMedia } from '@/server/http/serve-media';

/** Generated files (voice, renders, logos). */
export const GET = route<{ path: string[] }>(async (req, { path }) => {
  const rel = path.map(decodeURIComponent).join('/');
  // Refuses a path outside the media folder before anything else.
  resolveMedia(rel);
  // Another workspace's file is "not found", the same as a missing one.
  if (!await canReadMedia(rel)) throw notFound('tệp');
  return serveMedia(req, rel);
});
