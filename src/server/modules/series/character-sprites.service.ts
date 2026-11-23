// Makes the puppet's expression sprites from the series' reference picture: one picture-model call per expression
// (keeping the same character on a flat green background), then the background is keyed out in code.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { EXPRESSIONS, expressionPrompt, missingExpressions, type Expression } from '@/core/character/expressions';
import { UserFacingError } from '@/core/domain';
import type { Job } from '@/core/domain';
import type { ImagePort } from '@/core/ports';
import { images } from '@/server/adapters/image/image.service';
import { toSprite, type SpriteCanvas } from '@/server/adapters/media/chroma-key';
import { resolveMedia, saveCharacterFile } from '@/server/adapters/media/media.service';
import { jobRepository } from '@/server/modules/job/job.repository';

export const SpriteRequest = z.object({
  /** Media-relative path of the character's reference picture (bible.characterAssets[0]). */
  reference: z.string().min(1).max(300),
  /** Expressions to make; sprites the series already has are passed in `existing` and kept. */
  expressions: z.array(z.enum(EXPRESSIONS)).min(1).max(EXPRESSIONS.length).optional(),
  existing: z.record(z.string(), z.string()).default({}),
});
export type SpriteRequest = z.infer<typeof SpriteRequest>;

/** Only the pictures that cost money: one per missing expression. */
export const spriteCount = (req: Pick<SpriteRequest, 'expressions' | 'existing'>) => missingExpressions(req.existing, req.expressions ?? EXPRESSIONS).length;

type Progress = (fraction: number, phase?: string) => void;

/** Generates the missing expression sprites and returns the media-relative paths of the NEW ones only. */
export async function generateSprites(req: SpriteRequest, deps: { images: ImagePort; save?: (png: Buffer) => Promise<string>; resolve?: (rel: string) => string }, progress: Progress = () => {}): Promise<Record<string, string>> {
  const resolve = deps.resolve ?? resolveMedia;
  const save = deps.save ?? ((png: Buffer) => saveCharacterFile(png, '.png'));
  const todo = missingExpressions(req.existing, req.expressions ?? EXPRESSIONS);
  const made: Record<string, string> = {};
  if (!todo.length) return made;
  const reference = resolve(req.reference);
  await fs.access(reference).catch(() => {
    throw new UserFacingError('Không tìm thấy ảnh chuẩn của nhân vật. Tải ảnh chuẩn lên rồi thử lại.');
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-sprites-'));
  try {
    // The neutral sprite (new or existing) is also sent with the other expressions and fixes the size of all of them.
    let neutralFile = req.existing.neutral ? resolve(req.existing.neutral) : null;
    let canvas: SpriteCanvas | undefined;
    for (const [i, expr] of todo.entries()) {
      progress(i / todo.length, `Vẽ biểu cảm ${expr}`);
      const raw = path.join(dir, `${expr}.png`);
      await deps.images.generate(expressionPrompt(expr as Expression), raw, { purpose: 'character_sprite' }, neutralFile && expr !== 'neutral' ? [reference, neutralFile] : [reference]);
      const out = await toSprite(await fs.readFile(raw), canvas);
      if (expr === 'neutral') canvas = out.canvas;
      made[expr] = await save(out.png);
      if (expr === 'neutral') neutralFile = resolve(made[expr]);
    }
    return made;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export const characterSpriteService = {
  /** Validates and queues the worker job; the result (`{ sprites }`) is read from GET /jobs/:id. */
  async request(input: unknown): Promise<Job> {
    const req = SpriteRequest.parse(input);
    resolveMedia(req.reference);
    if (!spriteCount(req)) throw new UserFacingError('Đã có đủ biểu cảm, không cần tạo thêm.');
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập API key ở mục Tạo ảnh AI.');
    return jobRepository.insert(null, 'generate_sprites', req);
  },

  /** Runs in the worker. */
  async run(job: Job, progress: Progress): Promise<{ sprites: Record<string, string> }> {
    return { sprites: await generateSprites(SpriteRequest.parse(job.payload), { images }, progress) };
  },
};
