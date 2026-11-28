import type { Job } from '@/core/domain';
import { api } from '@/lib/api/client';
import type { AppConfig } from '@/server/modules/config/config.service';
import type { ChannelView } from '@/server/modules/channel/channel.service';

export type { AppConfig, ChannelView, Job };

export const appApi = {
  config: () => api<AppConfig>('/config'),
  channels: () => api<ChannelView[]>('/channels'),
};

export const jobApi = {
  get: (id: string) => api<Job>(`/jobs/${id}`),
};
