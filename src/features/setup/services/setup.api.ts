import type { Job } from '@/core/domain';
import type { ProjectSetup, SetupSkill } from '@/core/tasks/setup-project';
import { api } from '@/lib/api/client';
import type { ChannelView } from '@/server/modules/channel/channel.service';
import type { SetupInput } from '@/server/modules/setup/setup.types';

export type { ProjectSetup, SetupSkill, SetupInput };

export const setupApi = {
  propose: (idea: string) => api<{ proposal: ProjectSetup; skills: SetupSkill[] }>('/setup/propose', { body: { idea } }),
  apply: (input: SetupInput) => api<ChannelView>('/setup/apply', { body: input }),
  drawLibrary: (seriesId: string) => api<Job>(`/series/${seriesId}/library`, { method: 'POST' }),
};
