'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/features/app';
import { errorMessage } from '@/lib/api/client';

import { episodeApi, type EpisodeView } from '../services/episode.api';

export const episodeKeys = {
  list: (channelId: string) => ['episodes', channelId] as const,
  one: (id: string) => ['episode', id] as const,
  aiRuns: (id: string) => ['episode', id, 'ai-runs'] as const,
  tools: ['tools'] as const,
  skills: (channelId: string) => ['skills', channelId] as const,
};

export const isBusy = (v: Pick<EpisodeView, 'job'> | undefined) => Boolean(v?.job && (v.job.state === 'queued' || v.job.state === 'running'));
export const hasFailed = (v: Pick<EpisodeView, 'job'> | undefined) => v?.job?.state === 'failed';

/** One episode; polls while a job runs so progress and results appear without a reload. */
export function useEpisode(id: string) {
  return useQuery({ queryKey: episodeKeys.one(id), queryFn: () => episodeApi.get(id), refetchInterval: (q) => (isBusy(q.state.data) ? 1500 : false) });
}

export function useEpisodes(channelId: string | undefined) {
  return useQuery({
    queryKey: episodeKeys.list(channelId ?? ''),
    queryFn: () => episodeApi.list(channelId!),
    enabled: Boolean(channelId),
    refetchInterval: (q) => (q.state.data?.some(isBusy) ? 3000 : false),
  });
}

export function useTools() {
  return useQuery({ queryKey: episodeKeys.tools, queryFn: episodeApi.tools, staleTime: Infinity });
}

/** The skills one channel owns (skills never cross channels). */
export function useSkills(channelId: string | undefined) {
  return useQuery({ queryKey: episodeKeys.skills(channelId ?? ''), queryFn: () => episodeApi.skills(channelId!), enabled: Boolean(channelId), staleTime: 30_000 });
}

/** A mutation that returns the updated episode: writes it to the cache and refreshes lists. */
export function useEpisodeAction<A>(id: string, fn: (arg: A) => Promise<EpisodeView>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (view) => {
      qc.setQueryData(episodeKeys.one(id), view);
      void qc.invalidateQueries({ queryKey: ['episodes'] });
      void qc.invalidateQueries({ queryKey: queryKeys.config });
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
