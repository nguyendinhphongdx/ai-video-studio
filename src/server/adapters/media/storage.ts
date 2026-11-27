// Object storage (S3, Cloudflare R2, MinIO…) as the lasting copy of data/media. The local folder stays the working copy:
// ffmpeg, Remotion and the TTS tools need real files. The worker pulls what a job needs before it runs and pushes what
// it made afterwards; the web app uploads what people add and serves files it does not have through a short-lived
// signed URL. With S3_BUCKET unset everything stays on the local disk, as before.
//
// Env: S3_BUCKET, S3_ENDPOINT (R2: https://<account>.r2.cloudflarestorage.com), S3_REGION (R2: auto),
// S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PREFIX (optional key prefix, e.g. "media/").
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { S3Client } from '@aws-sdk/client-s3';

import { MEDIA_DIR } from '@/server/config';
import { createLogger } from '@/server/logger';

const logger = createLogger('storage');

const BUCKET = () => process.env.S3_BUCKET || '';
const PREFIX = () => process.env.S3_PREFIX || '';
/** How long a signed download link stays valid. */
const URL_SECONDS = 15 * 60;

const g = globalThis as unknown as { __avsS3?: Promise<S3Client> };
async function client(): Promise<S3Client> {
  g.__avsS3 ??= import('@aws-sdk/client-s3').then(
    ({ S3Client: Client }) =>
      new Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        // MinIO and most self-hosted S3 want path-style URLs; R2 and AWS accept them too.
        forcePathStyle: true,
        credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } : undefined,
      }),
  );
  return g.__avsS3;
}

const keyOf = (rel: string) => PREFIX() + rel.split(path.sep).join('/');
const relOf = (key: string) => key.slice(PREFIX().length);
const localOf = (rel: string) => path.join(MEDIA_DIR, rel);

interface Remote {
  rel: string;
  size: number;
  modified: number;
}

async function listRemote(prefix: string, flat = false): Promise<Remote[]> {
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const s3 = await client();
  const out: Remote[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: keyOf(prefix), ContinuationToken: token, Delimiter: flat ? '/' : undefined }));
    for (const o of page.Contents ?? []) if (o.Key && !o.Key.endsWith('/')) out.push({ rel: relOf(o.Key), size: o.Size ?? 0, modified: o.LastModified?.getTime() ?? 0 });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function listLocal(prefix: string, flat = false): Promise<{ rel: string; size: number; modified: number }[]> {
  const root = localOf(prefix);
  const entries = await fsp.readdir(root, { recursive: !flat, withFileTypes: true }).catch(() => []);
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath, e.name);
    const st = await fsp.stat(abs);
    out.push({ rel: path.relative(MEDIA_DIR, abs), size: st.size, modified: st.mtimeMs });
  }
  return out;
}

async function upload(rel: string) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const abs = localOf(rel);
  const { size } = await fsp.stat(abs);
  await (await client()).send(new PutObjectCommand({ Bucket: BUCKET(), Key: keyOf(rel), Body: fs.createReadStream(abs), ContentLength: size }));
}

async function download(rel: string, modified?: number) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const res = await (await client()).send(new GetObjectCommand({ Bucket: BUCKET(), Key: keyOf(rel) }));
  const abs = localOf(rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.part`;
  await pipeline(res.Body as Readable, fs.createWriteStream(tmp));
  await fsp.rename(tmp, abs);
  // Same time as the stored copy, so the next push does not send it back.
  const at = new Date(modified ?? res.LastModified?.getTime() ?? Date.now());
  await fsp.utimes(abs, at, at);
}

/** Runs `fn` over `items`, a few at a time. */
async function each<T>(items: T[], fn: (t: T) => Promise<void>, n = 8) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]!);
  }));
}

export const storage = {
  get enabled() {
    return !!BUCKET();
  },

  /** Uploads every file under `prefix` that the bucket lacks or has older or of another size. */
  async push(prefix: string, opts: { flat?: boolean } = {}): Promise<number> {
    if (!storage.enabled) return 0;
    const remote = new Map((await listRemote(prefix, opts.flat)).map((r) => [r.rel, r]));
    const todo = (await listLocal(prefix, opts.flat)).filter((l) => {
      const r = remote.get(l.rel);
      return !r || r.size !== l.size || l.modified > r.modified + 1000;
    });
    await each(todo, (l) => upload(l.rel));
    if (todo.length) logger.info(`pushed ${todo.length} files`, { prefix });
    return todo.length;
  },

  /** Downloads every file under `prefix` that the local copy lacks or has older or of another size. */
  async pull(prefix: string, opts: { flat?: boolean } = {}): Promise<number> {
    if (!storage.enabled) return 0;
    const local = new Map((await listLocal(prefix, opts.flat)).map((l) => [l.rel, l]));
    const todo = (await listRemote(prefix, opts.flat)).filter((r) => {
      const l = local.get(r.rel);
      return !l || l.size !== r.size || r.modified > l.modified + 1000;
    });
    await each(todo, (r) => download(r.rel, r.modified));
    if (todo.length) logger.info(`pulled ${todo.length} files`, { prefix });
    return todo.length;
  },

  /** Uploads one file the web app just wrote (a logo, a character picture). */
  async put(rel: string) {
    if (storage.enabled) await upload(rel);
  },

  /** Makes sure one file is on the local disk (downloading it if only the bucket has it); false when nowhere. */
  async ensureLocal(rel: string): Promise<boolean> {
    if (fs.existsSync(localOf(rel))) return true;
    if (!storage.enabled) return false;
    try {
      await download(rel);
      return true;
    } catch (e) {
      if ((e as { name?: string }).name === 'NoSuchKey') return false;
      throw e;
    }
  },

  /** Deletes every stored file under `prefix` (an episode or a channel being removed). */
  async remove(prefix: string) {
    if (!storage.enabled) return;
    const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const keys = (await listRemote(prefix)).map((r) => ({ Key: keyOf(r.rel) }));
    for (let i = 0; i < keys.length; i += 1000) await (await client()).send(new DeleteObjectsCommand({ Bucket: BUCKET(), Delete: { Objects: keys.slice(i, i + 1000) } }));
  },

  /** A short-lived download link for a stored file, or null when the bucket does not have it. */
  async signedUrl(rel: string, contentType: string): Promise<string | null> {
    if (!storage.enabled) return null;
    const { GetObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const s3 = await client();
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET(), Key: keyOf(rel) }));
    } catch {
      return null;
    }
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET(), Key: keyOf(rel), ResponseContentType: contentType }), { expiresIn: URL_SECONDS });
  },
};

/** The media a job of this workspace may read or write: its video, its channel, the workspace's character pictures. */
export function jobPrefixes(workspaceId: string, episodeId: string | null, channelId: string | undefined) {
  return [
    ...(episodeId ? [{ prefix: `episodes/${episodeId}/` }] : []),
    ...(channelId ? [{ prefix: `channels/${channelId}/` }] : []),
    { prefix: `series-characters/${workspaceId}/` },
    // Character pictures from before workspaces sit directly in series-characters/.
    { prefix: 'series-characters/', flat: true },
  ];
}
