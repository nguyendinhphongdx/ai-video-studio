// A series' characters as one list: reading them, saving edits as a new rules version, and drawing missing pictures in
// the worker. A drawing saves itself, so it also works when nobody has the library screen open (the assistant).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { firstPicturePrompt, POSE_ID, type SpriteKey } from '@/core/character/expressions';
import { findCharacter, missingPictures, setPicture, type Character } from '@/core/character/roster';
import { DEFAULT_IMAGE_STYLE, UserFacingError, type Job } from '@/core/domain';
import type { SeriesBible } from '@/core/domain/series';
import type { ImagePort } from '@/core/ports';
import { images } from '@/server/adapters/image/image.service';
import { toSprite } from '@/server/adapters/media/chroma-key';
import { resolveMedia, saveCharacterFile } from '@/server/adapters/media/media.service';
import { channelService } from '@/server/modules/channel/channel.service';
import { jobRepository } from '@/server/modules/job/job.repository';

import { generateSprites } from './character-sprites.service';
import { seriesService, type SeriesView } from './series.service';

export const DrawRequest = z.object({
  characterId: z.string().regex(POSE_ID),
  /** Slots to draw (default: every missing one). Drawn pictures are kept. */
  keys: z.array(z.string().max(40)).min(1).max(40).optional(),
});
export type DrawRequest = z.infer<typeof DrawRequest>;

const DrawPayload = DrawRequest.extend({ seriesId: z.string(), channelId: z.string() });

type Deps = { images: ImagePort; save?: (png: Buffer) => Promise<string>; resolve?: (rel: string) => string };

/** Draws the missing pictures of one character; whatever is finished is handed to `keep`, also after a failure. */
export async function drawPictures(bible: SeriesBible, character: Character, keys: string[] | undefined, style: string, deps: Deps, keep: (made: Record<string, string>) => Promise<void>, progress: (f: number, phase?: string) => void = () => {}): Promise<number> {
  const resolve = deps.resolve ?? resolveMedia;
  const save = deps.save ?? ((png: Buffer) => saveCharacterFile(png, '.png'));
  const todo = missingPictures(character, keys);
  const made: Record<string, string> = {};
  try {
    for (const [i, key] of todo.entries()) {
      progress(i / todo.length, `Vẽ ${character.name}`);
      const plain = made.neutral ?? character.pictures.neutral;
      const reference = character.hero ? (character.references[0] ?? plain) : plain;
      if (!reference) {
        // Nothing to copy yet: the first picture comes from the description.
        if (!character.description) throw new UserFacingError(`Cần mô tả hoặc ảnh của ${character.name} trước khi vẽ.`);
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-character-'));
        try {
          const raw = path.join(dir, 'first.png');
          await deps.images.generate(firstPicturePrompt(character.description, character.kind === 'prop', style), raw, { purpose: 'character_sprite' });
          made[key] = await save((await toSprite(await fs.readFile(raw))).png);
        } finally {
          await fs.rm(dir, { recursive: true, force: true });
        }
        continue;
      }
      const custom = key.startsWith('pose:') ? [{ key, prompt: bible.customPoses?.[key.slice(5)] ?? '' }] : undefined;
      const sprite = await generateSprites(
        { reference, existing: plain && character.hero ? { neutral: plain } : {}, target: character.hero ? 'hero' : 'cast', ...(custom ? { custom } : { expressions: [key as SpriteKey] }) },
        { images: deps.images, save, resolve },
      );
      Object.assign(made, sprite);
    }
  } finally {
    if (Object.keys(made).length) await keep(made);
  }
  return Object.keys(made).length;
}

async function active(seriesId: string, characterId: string) {
  return (await jobRepository.listActive()).some((j) => j.kind === 'draw_character' && j.payload.seriesId === seriesId && j.payload.characterId === characterId);
}

export const characterService = {
  /** Applies an edit to the latest rules and saves them as the next version. */
  async edit(seriesId: string, change: (bible: SeriesBible) => SeriesBible): Promise<SeriesView> {
    const s = await seriesService.get(seriesId);
    return await seriesService.saveRules(seriesId, { skillId: s.rules.skillId, format: s.rules.format, publish: s.rules.publish, bible: change(s.rules.bible) as Parameters<typeof seriesService.saveRules>[1]['bible'] });
  },

  /** The slots a drawing request would pay for. */
  async missing(seriesId: string, input: DrawRequest): Promise<{ character: Character; keys: string[] }> {
    const s = await seriesService.get(seriesId);
    const character = findCharacter(s.rules.bible, input.characterId);
    return { character, keys: missingPictures(character, input.keys) };
  },

  async requestDraw(seriesId: string, input: unknown): Promise<Job> {
    const req = DrawRequest.parse(input);
    const s = await seriesService.get(seriesId);
    const { character, keys } = await characterService.missing(seriesId, req);
    if (!keys.length) throw new UserFacingError(`${character.name} đã đủ ảnh, không cần vẽ thêm.`);
    if (!character.pictures.neutral && !character.references.length && !character.description) throw new UserFacingError(`Cần mô tả hoặc ảnh của ${character.name} trước khi vẽ.`);
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập API key ở mục Tạo ảnh AI.');
    if (await active(seriesId, req.characterId)) throw new UserFacingError(`Đang vẽ ${character.name} rồi, đợi xong đã.`);
    return await jobRepository.insert(null, 'draw_character', { seriesId, channelId: s.channelId, ...req });
  },

  /** The drawing under way for any character of this series. */
  async drawing(seriesId: string): Promise<Job[]> {
    await seriesService.get(seriesId);
    return (await jobRepository.listActive()).filter((j) => j.kind === 'draw_character' && j.payload.seriesId === seriesId);
  },

  /** Runs in the worker. */
  async runDraw(job: Job, progress: (f: number, phase?: string) => void): Promise<void> {
    const p = DrawPayload.parse(job.payload);
    const s = await seriesService.get(p.seriesId);
    const channel = await channelService.get(s.channelId);
    const bible = s.rules.bible;
    await drawPictures(bible, findCharacter(bible, p.characterId), p.keys, channel.imageStyle.trim() || DEFAULT_IMAGE_STYLE, { images }, async (made) => {
      // The latest rules, not the ones the job started from: edits made meanwhile stay, and so do their pictures.
      await characterService.edit(p.seriesId, (latest) =>
        Object.entries(made).reduce((b, [key, file]) => {
          const now = findCharacter(b, p.characterId);
          if (now.pictures[key]) return b;
          const next = setPicture(b, p.characterId, key, file);
          // A first character drawn from words keeps that picture as its reference.
          return now.hero && key === 'neutral' && !next.characterAssets.length ? { ...next, characterAssets: [file] } : next;
        }, latest),
      );
    }, progress);
  },
};
