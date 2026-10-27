// A Skill is a playbook for one kind of video: channel_skills rows (installed from market/skills/<id>/SKILL.md or written in the app).
// Front matter declares the tools/blocks it may use; the body tells the AI how to write the video
// and mentions tools as @tool or @tool/block. Pure parsing + linting; file IO lives in the server.
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import type { ToolCatalog } from '../tools/catalog';
import { mentionsIn, normalizeRef } from '../tools/mention';

export const SKILL_ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

const FrontMatter = z.object({
  name: z.string().min(1, 'Skill cần có name'),
  description: z.string().default(''),
  tools: z.array(z.string()).min(1, 'Skill cần ít nhất 1 tool'),
  version: z.union([z.string(), z.number()]).transform(String).default('1'),
  tags: z.array(z.string()).default([]),
  imageStyle: z.string().default(''),
  scenes: z
    .string()
    .regex(/^\d+-\d+$/, 'scenes phải có dạng "4-8"')
    .default('4-8'),
});

export interface Skill {
  id: string;
  name: string;
  description: string;
  /** Tool or block references, e.g. ["remotion/title", "remotion/cards"] or ["remotion"]. */
  tools: string[];
  scenes: { min: number; max: number };
  /** Markdown instructions for the AI. */
  body: string;
  /** Market metadata (also kept when a skill is copied into a channel). */
  version: string;
  tags: string[];
  /** The look of every AI picture of videos made with this skill (English, appended to each scene's subject). Empty: the block's or the channel's style. */
  imageStyle: string;
}

export interface SkillIssue {
  level: 'error' | 'warning';
  message: string;
}

export function parseSkill(id: string, markdown: string): Skill {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
  if (!m) throw new Error('SKILL.md phải bắt đầu bằng phần khai báo giữa hai dòng ---');
  const fm = FrontMatter.parse(parseYaml(m[1] ?? '') ?? {});
  const [min, max] = fm.scenes.split('-').map(Number) as [number, number];
  return { id, name: fm.name, description: fm.description, tools: fm.tools.map(normalizeRef), scenes: { min, max }, body: (m[2] ?? '').trim(), version: fm.version, tags: fm.tags, imageStyle: fm.imageStyle.trim() };
}

export function serializeSkill(skill: Omit<Skill, 'id'>): string {
  const fm = stringifyYaml({ name: skill.name, description: skill.description, version: skill.version, tags: skill.tags, ...(skill.imageStyle ? { imageStyle: skill.imageStyle } : {}), tools: skill.tools, scenes: `${skill.scenes.min}-${skill.scenes.max}` });
  return `---\n${fm}---\n\n${skill.body.trim()}\n`;
}

/** Problems to fix before the skill can be used. Errors block saving. */
export function lintSkill(skill: Skill, catalog: ToolCatalog): SkillIssue[] {
  const issues: SkillIssue[] = [];
  const declared = catalog.resolve(skill.tools);
  for (const ref of declared.unknown) issues.push({ level: 'error', message: `Tool không tồn tại: @${ref}` });
  const allowed = new Set(declared.blocks.map((b) => b.ref));
  for (const ref of mentionsIn(skill.body)) {
    const used = catalog.resolve([ref]);
    if (used.unknown.length) issues.push({ level: 'error', message: `Nhắc tới tool không tồn tại: @${ref}` });
    else if (used.blocks.some((b) => !allowed.has(b.ref))) issues.push({ level: 'warning', message: `@${ref} được nhắc trong hướng dẫn nhưng chưa khai báo trong tools` });
  }
  if (skill.scenes.min > skill.scenes.max) issues.push({ level: 'error', message: 'scenes: số nhỏ phải đứng trước' });
  return issues;
}
