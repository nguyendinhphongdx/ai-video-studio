import fs from 'node:fs';
import { Readable } from 'node:stream';

import { mimeOf, resolveMedia } from '@/server/adapters/media/media.service';
import { notFound } from '@/server/http/api-error';
import { route } from '@/server/http/route';

/** Generated files (voice, renders, logos) with HTTP range support so videos can seek. */
export const GET = route<{ path: string[] }>(async (req, { path }) => {
  const file = resolveMedia(path.map(decodeURIComponent).join('/'));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw notFound('tệp');
  const size = fs.statSync(file).size;
  const type = mimeOf(file);
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
  const body = (start: number, end: number) => Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    return new Response(body(start, end), { status: 206, headers: { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': String(end - start + 1) } });
  }
  return new Response(body(0, size - 1), { headers: { 'content-type': type, 'content-length': String(size), 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' } });
});
