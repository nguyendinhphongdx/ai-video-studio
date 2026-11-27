import fs from 'node:fs';
import { Readable } from 'node:stream';

import { canReadMedia } from '@/server/adapters/media/media-access';
import { mimeOf, resolveMedia } from '@/server/adapters/media/media.service';
import { storage } from '@/server/adapters/media/storage';
import { notFound } from '@/server/http/api-error';
import { route } from '@/server/http/route';

/** Generated files (voice, renders, logos) with HTTP range support so videos can seek. */
export const GET = route<{ path: string[] }>(async (req, { path }) => {
  const rel = path.map(decodeURIComponent).join('/');
  const file = resolveMedia(rel);
  // Another workspace's file is "not found", the same as a missing one.
  if (!await canReadMedia(rel)) throw notFound('tệp');
  if (!fs.existsSync(file)) {
    // Not on this machine: the stored copy, through a short-lived signed link (the bucket handles range requests).
    const url = await storage.signedUrl(rel, mimeOf(file));
    if (url) return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'private, no-store' } });
    throw notFound('tệp');
  }
  if (!fs.statSync(file).isFile()) throw notFound('tệp');
  const size = fs.statSync(file).size;
  const type = mimeOf(file);
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
  const body = (start: number, end: number) => Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
  if (range) {
    const unsatisfiable = () => new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}`, 'accept-ranges': 'bytes' } });
    let start: number;
    let end: number;
    if (!range[1] && range[2]) {
      // Suffix range: the last N bytes.
      const n = Number(range[2]);
      if (n === 0) return unsatisfiable();
      start = Math.max(size - n, 0);
      end = size - 1;
    } else {
      start = range[1] ? Number(range[1]) : 0;
      end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    }
    if (size === 0 || start >= size || start > end) return unsatisfiable();
    return new Response(body(start, end), { status: 206, headers: { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': String(end - start + 1) } });
  }
  if (size === 0) return new Response(null, { headers: { 'content-type': type, 'content-length': '0' } });
  return new Response(body(0, size - 1), { headers: { 'content-type': type, 'content-length': String(size), 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' } });
});
