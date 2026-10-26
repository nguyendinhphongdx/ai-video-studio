// Publish kit download: the rendered videos, thumbnails and the text for each platform in one zip.
import fs from 'node:fs/promises';
import path from 'node:path';

import { zipSync, strToU8 } from 'fflate';

import { slugify } from '@/core/domain/ids';
import { publishMarkdown } from '@/core/script/publish';
import { resolveMedia } from '@/server/adapters/media/media.service';
import { conflict } from '@/server/http/api-error';
import { episodeRepository } from '@/server/modules/episode/episode.repository';
import { loadEpisode } from '@/server/modules/episode/episode.store';

export const publishService = {
  async kitZip(episodeId: string): Promise<{ name: string; data: Uint8Array }> {
    const episode = loadEpisode(episodeId);
    const renders = episodeRepository.renders(episodeId);
    if (!renders.length) throw conflict('Video chưa được dựng');
    const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = { 'dang-bai.md': strToU8(publishMarkdown(episode, renders)) };
    for (const r of renders) {
      // mp4 is already compressed: store it as-is.
      files[path.basename(r.filePath)] = [new Uint8Array(await fs.readFile(resolveMedia(r.filePath))), { level: 0 }];
      if (r.thumbnailPath) files[`thumbnail-${r.format}.jpg`] = [new Uint8Array(await fs.readFile(resolveMedia(r.thumbnailPath))), { level: 0 }];
    }
    return { name: `${slugify(episode.title || episode.topic)}.zip`, data: zipSync(files) };
  },
};
