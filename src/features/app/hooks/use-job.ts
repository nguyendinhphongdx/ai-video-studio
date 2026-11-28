'use client';

import { useQuery } from '@tanstack/react-query';

import { jobApi } from '../services/app.service';

/**
 * One job by id, the same query for every screen that waits on it. It is fetched once; the live feed writes its
 * progress into the cache and refetches it (with the result) when it ends (use-live-changes).
 */
export function useJob(id: string | null | undefined) {
  return useQuery({ queryKey: ['job', id], queryFn: () => jobApi.get(id!), enabled: Boolean(id) });
}
