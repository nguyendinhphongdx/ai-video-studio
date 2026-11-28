import fs from 'node:fs/promises';

import type { ChatImage } from '@/core/ports';
import { mimeOf, resolveMedia } from '@/server/adapters/media/media.service';

/** Larger pictures are only linked: they would crowd out the rest of the conversation. */
const MAX_BYTES = 5 * 1024 * 1024;

export async function pictureAt(path: string): Promise<ChatImage[]> {
  const data = await fs.readFile(resolveMedia(path)).catch(() => null);
  return data && data.length <= MAX_BYTES ? [{ mime: mimeOf(path), base64: data.toString('base64') }] : [];
}
