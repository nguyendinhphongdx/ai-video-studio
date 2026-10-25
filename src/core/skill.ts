// A Skill is a playbook for one kind of video, written in Markdown (skills/<id>/SKILL.md) and kept in git.
// Front matter declares which tools it may use; the body tells the AI how to write the video and
// mentions tools as @tool-id. Pure parsing here; reading/writing files lives in the server.
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

export const SKILL_ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

const FrontMatter = z.object({
  name: z.string().min(1, 'Skill cần có name'),
  description: z.string().default(''),
  tools: z.array(z.string()).min(1, 'Skill cần ít nhất 1 tool'),
  /** Suggested scene range, e.g. "4-8". */
  scenes: z
    .string()
    .regex(/^\d+-\d+$/, 'scenes phải có dạng "4-8"')
    .default('4-8'),
  /** Background track from public/audio/, or "none". */
  music: z.string().default('music.wav'),
});

export interface Skill {
  id: string;
  name: string;
  description: string;
  tools: string[];
  scenes: { min: number; max: number };
  music: string;
  /** Markdown instructions for the AI. */
  body: string;
}

export function parseSkill(id: string, markdown: string): Skill {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
  if (!m) throw new Error('SKILL.md phải bắt đầu bằng phần khai báo giữa hai dòng ---');
  const fm = FrontMatter.parse(parseYaml(m[1] ?? '') ?? {});
  const [min, max] = fm.scenes.split('-').map(Number) as [number, number];
  return { id, name: fm.name, description: fm.description, tools: fm.tools, scenes: { min, max }, music: fm.music, body: (m[2] ?? '').trim() };
}

export function serializeSkill(skill: Omit<Skill, 'id'>): string {
  const fm = stringifyYaml({
    name: skill.name,
    description: skill.description,
    tools: skill.tools,
    scenes: `${skill.scenes.min}-${skill.scenes.max}`,
    music: skill.music,
  });
  return `---\n${fm}---\n\n${skill.body.trim()}\n`;
}

/** Tool ids mentioned in the body as @tool-id. */
export function mentionedTools(body: string): string[] {
  return [...new Set([...body.matchAll(/(?:^|[\s(])@([a-z0-9][a-z0-9-]*)/g)].map((x) => x[1]!))];
}
