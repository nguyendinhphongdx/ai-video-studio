'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/features/app';
import { errorMessage } from '@/lib/api/client';

import { channelApi, type ChannelView } from '../services/channel.api';

const one = (id: string) => ['channel', id] as const;

export function useChannel(id: string) {
  return useQuery({ queryKey: one(id), queryFn: () => channelApi.get(id), refetchInterval: 4000 });
}

/** Mutation returning the updated channel: refreshes the channel and the switcher list. */
export function useChannelAction<A>(id: string, fn: (arg: A) => Promise<ChannelView>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (c) => {
      qc.setQueryData(one(id), c);
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      if (success) toast.success(success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
