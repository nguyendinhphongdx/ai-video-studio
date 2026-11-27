// Draws supporting characters and props for a series' puppet scenes and prints their media paths as JSON.
// Usage: npx tsx --env-file-if-exists=.env scripts/make-cast.ts <seriesId> <cast.json>
// cast.json: [{ "id": "ngao-binh", "kind": "character" | "item", "description": "..." }]; one picture is billed per entry.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { castPrompt, type CastKind } from '@/core/character/cast';
import { images } from '@/server/adapters/image/image.service';
import { toSprite } from '@/server/adapters/media/chroma-key';
import { resolveMedia, saveCharacterFile } from '@/server/adapters/media/media.service';
import { seriesRepository } from '@/server/modules/series/series.repository';
import { runWithContext, withUsage } from '@/server/context';
import { db } from '@/server/db';
import { authService } from '@/server/modules/auth/auth.service';

const [seriesId, file] = process.argv.slice(2);
if (!seriesId || !file) throw new Error('usage: make-cast.ts <seriesId> <cast.json>');
const items = JSON.parse(await fs.readFile(file, 'utf8')) as { id: string; kind: CastKind; description: string }[];
// A command-line run has no signed-in person: act in the series' own workspace, as its owner.
const owner = db().prepare('SELECT workspace_id FROM series WHERE id = ?').get(seriesId) as { workspace_id: string | null } | undefined;
const context = authService.contextFor(owner?.workspace_id ?? null, null);
if (!context) throw new Error('series not found');
await runWithContext(context, async () => {
const series = seriesRepository.find(seriesId);
if (!series) throw new Error('series not found');
const bible = seriesRepository.version(seriesId, series.currentVersion)!.bible;
const style = bible.characterSprites.neutral ?? bible.characterAssets[0];
if (!style) throw new Error('the series needs a character picture to copy the style from');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avs-cast-'));
const made: Record<string, string> = {};
await withUsage({ seriesId, channelId: series.channelId }, async () => {
  for (const it of items) {
    const raw = path.join(dir, `${it.id}.png`);
    await images.generate(castPrompt(it.description, it.kind), raw, { purpose: 'cast_sprite' }, [resolveMedia(style)]);
    const { png } = await toSprite(await fs.readFile(raw));
    made[it.id] = await saveCharacterFile(png, '.png');
    console.error(`made ${it.id} -> ${made[it.id]}`);
  }
});
await fs.rm(dir, { recursive: true, force: true });
console.log(JSON.stringify(made, null, 2));
});
