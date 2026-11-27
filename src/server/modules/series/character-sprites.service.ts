// Makes the puppet's expression sprites from the series' reference picture: one picture-model call per expression
// (keeping the same character on a flat green background), then the background is keyed out in code.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { CAST_POSES, customPosePrompt, EXPRESSIONS, expressionPrompt, heightRatio, isPoseKey, POSE_CANVAS_ASPECT, POSE_ID, SPRITES } from '@/core/character/expressions';
import { UserFacingError } from '@/core/domain';
import type { Job } from '@/core/domain';
import type { ImagePort } from '@/core/ports';
import { images } from '@/server/adapters/image/image.service';
import { canvasOf, toSprite, type SpriteCanvas } from '@/server/adapters/media/chroma-key';
import { resolveMedia, saveCharacterFile } from '@/server/adapters/media/media.service';
import { jobRepository } from '@/server/modules/job/job.repository';

export const SpriteRequest = z.object({
  /** Media-relative path of the character's reference picture (bible.characterAssets[0]). */
  reference: z.string().min(1).max(300),
  /** Sprites to make (expressions and/or poses; default: the expressions); ones the series already has are passed in `existing` and kept. */
  expressions: z.array(z.enum(SPRITES)).min(1).max(SPRITES.length).optional(),
  /** The series' own poses to draw: `pose:<id>` and the person's description. */
  custom: z
    .array(z.object({ key: z.string().regex(new RegExp(`^pose:${POSE_ID.source.slice(1, -1)}$`)), prompt: z.string().trim().min(3).max(300) }))
    .max(12)
    .optional(),
  /** `cast`: the reference is a supporting character's own picture (it stands in for neutral); only CAST_POSES are drawn. */
  target: z.enum(['hero', 'cast']).optional(),
  existing: z.record(z.string(), z.string()).default({}),
});
export type SpriteRequest = z.infer<typeof SpriteRequest>;

/** What to draw, in order (neutral first when a hero sprite needs it), with the prompt for each. */
export function planSprites(req: Pick<SpriteRequest, 'expressions' | 'custom' | 'existing' | 'target'>): [string, string][] {
  const cast = req.target === 'cast';
  const wanted: [string, string][] = [
    ...(req.expressions ?? (req.custom?.length ? [] : EXPRESSIONS)).filter((k) => !cast || (CAST_POSES as readonly string[]).includes(k)).map((k): [string, string] => [k, expressionPrompt(k)]),
    ...(cast ? [] : (req.custom ?? []).map((c): [string, string] => [c.key, customPosePrompt(c.prompt)])),
  ];
  const todo = wanted.filter(([k]) => !req.existing[k] && k !== 'neutral');
  const needNeutral = !cast && !req.existing.neutral && (todo.length > 0 || wanted.some(([k]) => k === 'neutral'));
  return needNeutral ? [['neutral', expressionPrompt('neutral')], ...todo] : todo;
}

/** Only the pictures that cost money: one per sprite still missing. */
export const spriteCount = (req: Pick<SpriteRequest, 'expressions' | 'custom' | 'existing' | 'target'>) => planSprites(req).length;

type Progress = (fraction: number, phase?: string) => void;

/** Generates the missing sprites and returns the media-relative paths of the NEW ones only. */
export async function generateSprites(req: SpriteRequest, deps: { images: ImagePort; save?: (png: Buffer) => Promise<string>; resolve?: (rel: string) => string }, progress: Progress = () => {}): Promise<Record<string, string>> {
  const resolve = deps.resolve ?? resolveMedia;
  const save = deps.save ?? ((png: Buffer) => saveCharacterFile(png, '.png'));
  const todo = planSprites(req);
  const cast = req.target === 'cast';
  const made: Record<string, string> = {};
  if (!todo.length) return made;
  const reference = resolve(req.reference);
  await fs.access(reference).catch(() => {
    throw new UserFacingError('Không tìm thấy ảnh chuẩn của nhân vật. Tải ảnh chuẩn lên rồi thử lại.');
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-sprites-'));
  try {
    // The neutral sprite (new or existing) is also sent with the other sprites and fixes the size of all of them.
    // A supporting character has no neutral sprite: its own picture is the only reference.
    let neutralFile = !cast && req.existing.neutral ? resolve(req.existing.neutral) : null;
    // Size every new sprite from the character as it stands in its neutral sprite (or the cast member's own picture).
    let canvas: SpriteCanvas | undefined = cast ? await canvasOf(await fs.readFile(reference)) : neutralFile ? await canvasOf(await fs.readFile(neutralFile)) : undefined;
    const sized = (c: SpriteCanvas, key: string): SpriteCanvas => (!cast && isPoseKey(key) ? { ...c, width: Math.max(c.width, Math.round(c.height * POSE_CANVAS_ASPECT)) } : c);
    for (const [i, [expr, prompt]] of todo.entries()) {
      progress(i / todo.length, `Vẽ ${expr}`);
      const raw = path.join(dir, `${expr.replace(':', '-')}.png`);
      await deps.images.generate(prompt, raw, { purpose: 'character_sprite' }, neutralFile && expr !== 'neutral' ? [reference, neutralFile] : [reference]);
      const out = await toSprite(await fs.readFile(raw), canvas && sized(canvas, expr), undefined, heightRatio(expr));
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
    if (!spriteCount(req)) throw new UserFacingError('Đã có đủ ảnh, không cần tạo thêm.');
    if (!(await images.isReady())) throw new UserFacingError('Chưa cài đặt tạo ảnh AI. Mở Cài đặt, nhập API key ở mục Tạo ảnh AI.');
    return await jobRepository.insert(null, 'generate_sprites', req);
  },

  /** Runs in the worker. */
  async run(job: Job, progress: Progress): Promise<{ sprites: Record<string, string> }> {
    return { sprites: await generateSprites(SpriteRequest.parse(job.payload), { images }, progress) };
  },
};
