import { lintSkill, parseSkill, type Skill, type SkillIssue } from '@/core/skills/skill';
import { notFound } from '@/server/http/api-error';
import { toolCatalog } from '@/tools/registry';

import { channelSkillRepository, marketRepository } from './skill.repository';

export interface MarketSkill extends Omit<Skill, 'body'> {
  issues: SkillIssue[];
  /** Id of the copy this channel already has, if any. */
  installedAs: string | null;
}

/** The market catalogue: what can be installed into a channel. */
export const marketService = {
  async list(channelId?: string): Promise<MarketSkill[]> {
    const installed = new Map(
      (channelId ? channelSkillRepository.list(channelId) : []).filter((r) => r.source.startsWith('market:')).map((r) => [r.source.slice(7), r.skillId] as const),
    );
    const out: MarketSkill[] = [];
    for (const id of await marketRepository.ids()) {
      const markdown = await marketRepository.read(id);
      if (!markdown) continue;
      try {
        const skill = parseSkill(id, markdown);
        const { body: _body, ...meta } = skill;
        out.push({ ...meta, issues: lintSkill(skill, toolCatalog), installedAs: installed.get(id) ?? null });
      } catch {
        // A broken catalogue entry is not offered.
      }
    }
    return out;
  },

  async get(id: string): Promise<{ skill: Skill; markdown: string; issues: SkillIssue[] }> {
    const markdown = await marketRepository.read(id);
    if (!markdown) throw notFound(`skill "${id}" trong market`);
    const skill = parseSkill(id, markdown);
    return { skill, markdown, issues: lintSkill(skill, toolCatalog) };
  },
};
