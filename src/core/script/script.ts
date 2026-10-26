// The script contract between the AI and the pipeline. The output schema is generated from the
// episode's active "ai" slots and their allowed blocks, so the AI can only produce what the format
// and the tools allow. Locked slots never reach the AI: they are filled from the format afterwards.
import { z } from 'zod';

import { UserFacingError } from '../domain/errors';
import { emptyAssets, type PublishKit, type Scene } from '../domain/episode';
import { newId } from '../domain/ids';
import { fillProps, fillTemplate, type Slot, type TemplateVars } from '../series/format';
import type { ToolCatalog } from '../tools/catalog';
import { normalizeRef } from '../tools/mention';
import { cleanProps, type ResolvedBlock } from '../tools/tool';

import { PublishKitSchema } from './publish';

const NARRATION = 'Lời đọc của cảnh, 1-2 câu, tiếng Việt có dấu, viết số bằng chữ ("ba quả táo")';

export interface DraftScene {
  block: string;
  narration: string;
  props: Record<string, unknown>;
}

/** What the AI writes: scenes grouped by slot id (only "ai" slots). */
export interface ScriptDraft {
  title: string;
  slots: Record<string, DraftScene[]>;
  publish: PublishKit;
}

export function slotBlocks(slot: Slot, catalog: ToolCatalog): ResolvedBlock[] {
  const { blocks, unknown } = catalog.resolve(slot.blocks);
  if (unknown.length) throw new UserFacingError(`Khe "${slot.name}" dùng tool không tồn tại: @${unknown.join(', @')}`);
  return blocks;
}

function sceneSchema(blocks: ResolvedBlock[]) {
  const variants = blocks.map((b) => z.object({ block: z.literal(b.ref), narration: z.string().describe(NARRATION), props: b.props }));
  if (!variants.length) throw new UserFacingError('Khe không có khối nào');
  return variants.length === 1 ? variants[0]! : z.discriminatedUnion('block', variants as [typeof variants[0], ...typeof variants]);
}

export function scriptSchema(slots: Slot[], catalog: ToolCatalog) {
  const shape: Record<string, z.ZodType> = {};
  for (const slot of slots.filter((s) => s.fill === 'ai')) {
    shape[slot.id] = z
      .array(sceneSchema(slotBlocks(slot, catalog)))
      .describe(`Khe "${slot.name}": ${slot.scenes.min === slot.scenes.max ? slot.scenes.min : `${slot.scenes.min}-${slot.scenes.max}`} cảnh. ${slot.guide}`.trim());
  }
  return z.object({
    title: z.string().describe('Tên tập/video, tối đa 40 ký tự'),
    slots: z.object(shape),
    publish: PublishKitSchema,
  });
}

/** Models often copy the "@remotion/cards" spelling from the context; accept it. */
function normalizeBlockRefs(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !('slots' in raw) || !raw.slots || typeof raw.slots !== 'object') return raw;
  const slots = Object.fromEntries(
    Object.entries(raw.slots as Record<string, unknown>).map(([k, list]) => [
      k,
      Array.isArray(list) ? list.map((s) => (s && typeof s === 'object' && typeof (s as { block?: unknown }).block === 'string' ? { ...s, block: normalizeRef((s as { block: string }).block) } : s)) : list,
    ]),
  );
  return { ...raw, slots };
}

/** Validate raw AI (or pasted) output against the schema and each block's props. */
export function parseDraft(raw: unknown, slots: Slot[], catalog: ToolCatalog): ScriptDraft {
  const parsed = scriptSchema(slots, catalog).parse(normalizeBlockRefs(raw)) as { title: string; slots: Record<string, DraftScene[]>; publish: PublishKit };
  const out: Record<string, DraftScene[]> = {};
  for (const [slotId, scenes] of Object.entries(parsed.slots)) {
    out[slotId] = scenes.map((s) => ({ block: s.block, narration: s.narration.trim(), props: cleanProps(catalog.block(s.block)!, s.props) }));
  }
  return { title: parsed.title.trim(), slots: out, publish: parsed.publish };
}

/** The scene a locked slot stands for, filled from the slot's template. */
export function lockedScene(slot: Slot, vars: TemplateVars, catalog: ToolCatalog): Scene {
  const block = catalog.block(slot.locked!.block);
  if (!block) throw new UserFacingError(`Khe khoá "${slot.name}" dùng khối không tồn tại: @${slot.locked!.block}`);
  return { id: newId(), slotId: slot.id, block: block.ref, locked: true, narration: fillTemplate(slot.locked!.narration, vars), props: cleanProps(block, fillProps(slot.locked!.props, vars)), approved: false, assets: emptyAssets() };
}

/**
 * A script written before the format had locked slots (or whose format gained one) gets them now: the channel's
 * intro and outro appear in their place, and an AI-written scene that only imitated one of them is dropped.
 * Returns null when nothing needs to change.
 */
export function withLockedScenes(slots: Slot[], scenes: Scene[], vars: TemplateVars, catalog: ToolCatalog): Scene[] | null {
  const locked = slots.filter((s) => s.fill === 'locked' && s.locked);
  const missing = locked.filter((s) => !scenes.some((x) => x.slotId === s.id));
  if (!missing.length) return null;
  const imitated = (x: Scene) => !x.locked && missing.some((s) => normalizeRef(s.locked!.block) === normalizeRef(x.block));
  const kept = scenes.filter((x) => !imitated(x));
  const out: Scene[] = [];
  for (const slot of slots) {
    if (slot.fill === 'locked' && slot.locked) out.push(...(kept.filter((x) => x.slotId === slot.id).length ? kept.filter((x) => x.slotId === slot.id) : [lockedScene(slot, vars, catalog)]));
    else out.push(...kept.filter((x) => x.slotId === slot.id));
  }
  out.push(...kept.filter((x) => !slots.some((s) => s.id === x.slotId)));
  return out;
}

/** Final scene list in slot order, with locked slots filled from the format template. */
export function assembleScenes(slots: Slot[], draft: ScriptDraft, vars: TemplateVars, catalog: ToolCatalog): Scene[] {
  const scenes: Scene[] = [];
  for (const slot of slots) {
    if (slot.fill === 'locked' && slot.locked) {
      scenes.push(lockedScene(slot, vars, catalog));
      continue;
    }
    for (const s of draft.slots[slot.id] ?? []) scenes.push({ id: newId(), slotId: slot.id, block: s.block, locked: false, narration: s.narration, props: s.props, approved: false, assets: emptyAssets() });
  }
  return scenes;
}

/** Current scenes back into draft form (for revisions). Locked scenes are left out: the AI cannot change them. */
export function draftFromScenes(title: string, scenes: Scene[], publish: PublishKit): ScriptDraft {
  const slots: Record<string, DraftScene[]> = {};
  for (const s of scenes) if (!s.locked) (slots[s.slotId] ??= []).push({ block: s.block, narration: s.narration, props: s.props });
  return { title, slots, publish };
}

/** Pull the JSON object out of text that may be wrapped in ``` fences or prose. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Không tìm thấy JSON trong nội dung');
  return JSON.parse(text.slice(start, end + 1));
}
