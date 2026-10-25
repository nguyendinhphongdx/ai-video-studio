import { mentionedTools, parseSkill, SKILL_ID_RE, type Skill } from '@/core/skill';
import type { SkillStore } from '@/core/ports';
import { ApiError, notFound } from '@/server/http/api-error';
import { toolCatalog } from '@/tools';

import { skillRepository } from './skill.repository';

export interface SkillIssue {
  level: 'error' | 'warning';
  message: string;
}

/** Problems a person should fix before using the skill. */
export function lintSkill(skill: Skill): SkillIssue[] {
  const issues: SkillIssue[] = [];
  for (const id of skill.tools) if (!toolCatalog.get(id)) issues.push({ level: 'error', message: `Tool không tồn tại: @${id}` });
  for (const id of mentionedTools(skill.body)) {
    if (!toolCatalog.get(id)) issues.push({ level: 'error', message: `Nhắc tới tool không tồn tại: @${id}` });
    else if (!skill.tools.includes(id)) issues.push({ level: 'warning', message: `@${id} được nhắc trong hướng dẫn nhưng chưa khai báo trong tools` });
  }
  if (skill.scenes.min > skill.scenes.max) issues.push({ level: 'error', message: 'scenes: số nhỏ phải đứng trước' });
  return issues;
}

export interface SkillSummary extends Omit<Skill, 'body'> {
  issues: SkillIssue[];
}

export const skillService = {
  async list(): Promise<SkillSummary[]> {
    const out: SkillSummary[] = [];
    for (const id of await skillRepository.ids()) {
      const md = await skillRepository.read(id);
      if (!md) continue;
      try {
        const { body: _body, ...meta } = parseSkill(id, md);
        out.push({ ...meta, issues: lintSkill(parseSkill(id, md)) });
      } catch (e) {
        out.push({ id, name: id, description: '', tools: [], scenes: { min: 0, max: 0 }, music: 'none', issues: [{ level: 'error', message: (e as Error).message }] });
      }
    }
    return out;
  },

  async get(id: string): Promise<{ skill: Skill; markdown: string; issues: SkillIssue[] }> {
    const md = await skillRepository.read(id);
    if (!md) throw notFound(`skill "${id}"`);
    const skill = parseSkill(id, md);
    return { skill, markdown: md, issues: lintSkill(skill) };
  },

  /** Save raw SKILL.md text; refuses a file that does not parse or uses unknown tools. */
  async save(id: string, markdown: string, { create = false } = {}) {
    if (!SKILL_ID_RE.test(id)) throw new ApiError(400, 'validation_error', 'Mã skill chỉ gồm chữ thường, số và dấu gạch ngang');
    const exists = (await skillRepository.read(id)) !== null;
    if (create && exists) throw new ApiError(409, 'conflict', `Skill "${id}" đã tồn tại`);
    if (!create && !exists) throw notFound(`skill "${id}"`);
    let skill: Skill;
    try {
      skill = parseSkill(id, markdown);
    } catch (e) {
      throw new ApiError(400, 'validation_error', (e as Error).message);
    }
    const errors = lintSkill(skill).filter((i) => i.level === 'error');
    if (errors.length) throw new ApiError(400, 'validation_error', errors.map((e) => e.message).join('; '));
    await skillRepository.write(id, markdown);
    return skillService.get(id);
  },
};

export const skillStore: SkillStore = {
  async get(id) {
    return (await skillService.get(id)).skill;
  },
};
