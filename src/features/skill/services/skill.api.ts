import type { Job } from '@/core/domain';
import type { Skill, SkillIssue } from '@/core/skills/skill';
import { api } from '@/lib/api/client';
import type { MarketSkill } from '@/server/modules/skill/market.service';
import type { SkillDetail, SkillSummary } from '@/server/modules/skill/skill.service';

export type { Job, MarketSkill, Skill, SkillDetail, SkillIssue, SkillSummary };

const c = (channelId: string, rest = '') => `/channels/${channelId}/skills${rest}`;

export const skillApi = {
  list: (channelId: string) => api<SkillSummary[]>(c(channelId)),
  get: (channelId: string, id: string) => api<SkillDetail>(c(channelId, `/${id}`)),
  create: (channelId: string, id: string, markdown: string, source: 'custom' | 'ai') => api<SkillDetail>(c(channelId), { body: { id, markdown, source } }),
  save: (channelId: string, id: string, markdown: string) => api<SkillDetail>(c(channelId, `/${id}`), { method: 'PUT', body: { markdown } }),
  remove: (channelId: string, id: string) => api<{ ok: true }>(c(channelId, `/${id}`), { method: 'DELETE' }),
  install: (channelId: string, marketId: string) => api<SkillDetail>(c(channelId, '/install'), { body: { marketId } }),
  market: (channelId: string) => api<MarketSkill[]>(`/market/skills?channelId=${encodeURIComponent(channelId)}`),
  author: (channelId: string, body: { goal: string; feedback: string; current: string }) => api<Job>(c(channelId, '/author'), { body }),
  job: (id: string) => api<Job>(`/jobs/${id}`),
};

export const skillKeys = { list: (channelId: string) => ['skills', channelId] as const, market: (channelId: string) => ['market', channelId] as const, one: (channelId: string, id: string) => ['skill', channelId, id] as const };
