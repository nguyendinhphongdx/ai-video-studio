import type { SkillStore } from '@/core/ports';
import { lintSkill, parseSkill, SKILL_ID_RE, type Skill, type SkillIssue } from '@/core/skills/skill';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { ROOT } from '@/server/config';
import { ApiError, notFound } from '@/server/http/api-error';
import { toolCatalog } from '@/tools/registry';

import { skillFile, skillRepository } from './skill.repository';

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
        const skill = parseSkill(id, md);
        const { body: _body, ...meta } = skill;
        out.push({ ...meta, issues: lintSkill(skill, toolCatalog) });
      } catch (e) {
        out.push({ id, name: id, description: '', tools: [], scenes: { min: 0, max: 0 }, issues: [{ level: 'error', message: (e as Error).message }] });
      }
    }
    return out;
  },

  async get(id: string): Promise<{ skill: Skill; markdown: string; issues: SkillIssue[]; path: string }> {
    const md = await skillRepository.read(id);
    if (!md) throw notFound(`skill "${id}"`);
    const skill = parseSkill(id, md);
    return { skill, markdown: md, issues: lintSkill(skill, toolCatalog), path: path.relative(ROOT, skillFile(id)) };
  },

  /** Opens SKILL.md in the default editor of the machine running the app (local use). */
  async openInEditor(id: string): Promise<{ ok: true; path: string }> {
    const { path: rel } = await skillService.get(id);
    const opener = process.platform === 'darwin' ? ['open', ['-t', skillFile(id)]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', skillFile(id)]] : ['xdg-open', [skillFile(id)]];
    await new Promise<void>((resolve, reject) => {
      const child = spawn(opener[0] as string, opener[1] as string[], { detached: true, stdio: 'ignore' });
      child.on('error', () => reject(new ApiError(501, 'cannot_open', `Không mở được trình soạn thảo. Mở tay file ${rel}`)));
      child.on('spawn', () => (child.unref(), resolve()));
    });
    return { ok: true, path: rel };
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
    const errors = lintSkill(skill, toolCatalog).filter((i) => i.level === 'error');
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
