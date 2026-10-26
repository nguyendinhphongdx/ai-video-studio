import { api } from '@/lib/api/client';
import type { Skill, SkillIssue } from '@/core/skills/skill';
import type { SkillSummary } from '@/server/modules/skill/skill.service';

export type SkillDetail = { skill: Skill; markdown: string; issues: SkillIssue[]; path: string };
export type { SkillSummary };

export const skillApi = {
  list: () => api<SkillSummary[]>('/skills'),
  get: (id: string) => api<SkillDetail>(`/skills/${id}`),
  openInEditor: (id: string) => api<{ ok: true; path: string }>(`/skills/${id}/open`, { method: 'POST' }),
};
