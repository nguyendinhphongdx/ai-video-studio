// The episode format locks a series' structure. Each slot is either "locked" (fixed text from the
// template, never touched by the AI) or "ai" (the AI fills N scenes using only the allowed blocks).
// One-off videos get a single "body" slot derived from their skill, so every video goes through the same path.
import { z } from 'zod';

import type { Skill } from '../skills/skill';

export const SlotSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Mã khe chỉ gồm chữ thường, số, gạch ngang'),
  name: z.string().min(1),
  fill: z.enum(['locked', 'ai']),
  /** first = only episode 1; not-first = from episode 2 (e.g. a recap). */
  when: z.enum(['always', 'first', 'not-first']).default('always'),
  /** Allowed tools/blocks for an "ai" slot. */
  blocks: z.array(z.string()).default([]),
  scenes: z.object({ min: z.number().int().min(0), max: z.number().int().min(1) }).default({ min: 1, max: 1 }),
  /** Slot-specific instruction for the AI. */
  guide: z.string().default(''),
  /** Content of a "locked" slot. Strings may use {n} {topic} {next_topic} {series} {title} {channel}. */
  locked: z
    .object({ block: z.string(), narration: z.string(), props: z.record(z.string(), z.unknown()) })
    .optional(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const EpisodeFormatSchema = z.object({
  durationSec: z.object({ min: z.number(), max: z.number() }).nullable().default(null),
  slots: z.array(SlotSchema).min(1),
});
export type EpisodeFormat = z.infer<typeof EpisodeFormatSchema>;

export const ONE_OFF_SLOT = 'body';

export function formatFromSkill(skill: Skill, sceneCount: number | null): EpisodeFormat {
  const scenes = sceneCount ? { min: sceneCount, max: sceneCount } : skill.scenes;
  return { durationSec: null, slots: [{ id: ONE_OFF_SLOT, name: 'Nội dung', fill: 'ai', when: 'always', blocks: skill.tools, scenes, guide: '' }] };
}

/** Slots that apply to this episode. */
export function activeSlots(format: EpisodeFormat, episodeNumber: number | null): Slot[] {
  return format.slots.filter((s) => s.when === 'always' || (s.when === 'first' ? episodeNumber === 1 : (episodeNumber ?? 1) > 1));
}

export type TemplateVars = Partial<Record<'n' | 'topic' | 'next_topic' | 'series' | 'title' | 'channel', string>>;

export function fillTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{(n|topic|next_topic|series|title|channel)\}/g, (_, k: keyof TemplateVars) => vars[k] ?? '');
}

/** Recursively fill templates in string props of a locked scene. */
export function fillProps(props: Record<string, unknown>, vars: TemplateVars): Record<string, unknown> {
  const walk = (v: unknown): unknown =>
    typeof v === 'string' ? fillTemplate(v, vars) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
  return walk(props) as Record<string, unknown>;
}

export function lintFormat(format: EpisodeFormat): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const s of format.slots) {
    if (ids.has(s.id)) errors.push(`Trùng mã khe: ${s.id}`);
    ids.add(s.id);
    if (s.fill === 'locked' && !s.locked) errors.push(`Khe "${s.name}" bị khoá nhưng chưa có nội dung`);
    if (s.fill === 'ai' && !s.blocks.length) errors.push(`Khe "${s.name}" chưa chọn khối nào`);
    if (s.scenes.min > s.scenes.max) errors.push(`Khe "${s.name}": số cảnh nhỏ phải đứng trước`);
  }
  return errors;
}
