'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { isBusy } from '@/features/episode';
import { errorMessage } from '@/lib/api/client';

import { seriesApi, type SeriesView } from '../services/series.api';

export const seriesKeys = {
  list: (channelId: string) => ['series', channelId] as const,
  one: (id: string) => ['series-one', id] as const,
  episodes: (id: string) => ['series-episodes', id] as const,
  memory: (id: string) => ['series-memory', id] as const,
  versions: (id: string) => ['series-versions', id] as const,
};

export function useSeriesList(channelId: string | undefined) {
  return useQuery({ queryKey: seriesKeys.list(channelId ?? ''), queryFn: () => seriesApi.list(channelId!), enabled: Boolean(channelId) });
}

export function useSeries(id: string) {
  return useQuery({ queryKey: seriesKeys.one(id), queryFn: () => seriesApi.get(id) });
}

/** Episodes of a series, newest state first; polls while the worker writes or produces. */
export function useSeriesEpisodes(id: string) {
  return useQuery({
    queryKey: seriesKeys.episodes(id),
    queryFn: () => seriesApi.episodes(id),
    refetchInterval: (q) => (q.state.data?.some((v) => isBusy(v) || v.episode.status === 'producing') ? 2500 : false),
  });
}

export function useSeriesMemory(id: string) {
  return useQuery({ queryKey: seriesKeys.memory(id), queryFn: () => seriesApi.memory(id) });
}

export function useSeriesVersions(id: string) {
  return useQuery({ queryKey: seriesKeys.versions(id), queryFn: () => seriesApi.versions(id) });
}

/** Mutation that refreshes everything about one series (and the lists) after it succeeds. */
export function useSeriesAction<A, R>(id: string, fn: (arg: A) => Promise<R>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (result && typeof result === 'object' && 'rules' in result) qc.setQueryData(seriesKeys.one(id), result as unknown as SeriesView);
      void qc.invalidateQueries({ queryKey: ['series'] });
      void qc.invalidateQueries({ queryKey: seriesKeys.episodes(id) });
      void qc.invalidateQueries({ queryKey: seriesKeys.memory(id) });
      void qc.invalidateQueries({ queryKey: seriesKeys.versions(id) });
      void qc.invalidateQueries({ queryKey: ['episodes'] });
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
