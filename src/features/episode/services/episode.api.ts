import { api } from '@/lib/api/client';
import type { AiRun } from '@/core/agent/runner';
import type { SkillSummary } from '@/server/modules/skill/skill.service';
import type { ToolInfo, BlockInfo } from '@/server/modules/tool/tool.service';
import type { CreateEpisodeInput, EpisodeOptionsInput, EpisodeView, SaveScriptInput } from '@/server/modules/episode/episode.types';

export type { SceneAssetView } from '@/server/modules/episode/episode.types';
export type { AiRun, BlockInfo, CreateEpisodeInput, EpisodeView, SaveScriptInput, SkillSummary, ToolInfo };

const ep = (id: string, rest = '') => `/episodes/${id}${rest}`;

export const episodeApi = {
  topicIdeas: (channelId: string) => api<{ topic: string; why: string }[]>(`/channels/${channelId}/topic-ideas`, { method: 'POST' }),
  list: (channelId: string) => api<EpisodeView[]>(`/episodes?channelId=${encodeURIComponent(channelId)}`),
  get: (id: string) => api<EpisodeView>(ep(id)),
  create: (input: Partial<CreateEpisodeInput> & Pick<CreateEpisodeInput, 'channelId' | 'topic' | 'formats'>) => api<EpisodeView>('/episodes', { body: input }),
  remove: (id: string) => api<{ ok: true }>(ep(id), { method: 'DELETE' }),
  changeSkill: (id: string, skillId: string) => api<EpisodeView>(ep(id), { method: 'PATCH', body: { skillId } }),
  updateOptions: (id: string, input: EpisodeOptionsInput) => api<EpisodeView>(ep(id), { method: 'PATCH', body: input }),
  saveScript: (id: string, input: SaveScriptInput) => api<EpisodeView>(ep(id, '/script'), { method: 'PUT', body: input }),
  writeScript: (id: string) => api<EpisodeView>(ep(id, '/script'), { method: 'POST' }),
  revise: (id: string, feedback: string) => api<EpisodeView>(ep(id, '/revise'), { body: { feedback } }),
  assets: (id: string, body: { sceneIds: string[] | null; image: boolean; voice: boolean; force?: boolean }) => api<EpisodeView>(ep(id, '/assets'), { body }),
  approvals: (id: string, body: { sceneIds: string[] | null; approved: boolean }) => api<EpisodeView>(ep(id, '/approvals'), { body }),
  approveScript: (id: string) => api<EpisodeView>(ep(id, '/approve-script'), { method: 'POST' }),
  approveVideo: (id: string) => api<EpisodeView>(ep(id, '/approve-video'), { method: 'POST' }),
  rejectVideo: (id: string, feedback: string) => api<EpisodeView>(ep(id, '/reject-video'), { body: { feedback } }),
  retry: (id: string) => api<EpisodeView>(ep(id, '/retry'), { method: 'POST' }),
  importScript: (id: string, text: string) => api<EpisodeView>(ep(id, '/import'), { body: { text } }),
  prompt: (id: string, feedback?: string) => api<{ prompt: string }>(ep(id, `/prompt${feedback ? `?feedback=${encodeURIComponent(feedback)}` : ''}`)),
  aiRuns: (id: string) => api<AiRun[]>(ep(id, '/ai-runs')),
  tools: () => api<ToolInfo[]>('/tools'),
  skills: (channelId: string) => api<SkillSummary[]>(`/channels/${channelId}/skills`),
  previewVoice: (text: string, voice: string) => api<{ url: string }>('/tts/preview', { body: { text, voice } }),
};

export const downloadUrl = {
  zip: (id: string) => `/api/v1${ep(id, '/publish-kit.zip')}`,
  markdown: (id: string) => `/api/v1${ep(id, '/publish-kit')}`,
};
