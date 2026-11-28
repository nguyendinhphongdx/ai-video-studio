'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { jobApi } from '../services/app.service';

/** What a finished job may have changed on screen: refreshed once when any job ends. */
export const JOB_AFFECTS: readonly (readonly string[])[] = [['channel'], ['channels'], ['config'], ['usage'], ['episodes'], ['episode'], ['drawing'], ['logo-draft']];

const ended = (state: string | undefined) => state === 'done' || state === 'failed';

/**
 * One job by id, the same query for every screen that waits on it. Polls only while it is queued or running, and
 * refreshes what the job may have changed once when it ends. (Replaced by live signals in 0006 step 2.)
 */
export function useJob(id: string | null | undefined) {
  const qc = useQueryClient();
  const job = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (q) => (ended(q.state.data?.state) ? false : 1500),
  });
  const state = job.data?.state;
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !ended(state) || done.current === id) return;
    done.current = id;
    for (const key of JOB_AFFECTS) void qc.invalidateQueries({ queryKey: [...key] });
  }, [id, state, qc]);
  return job;
}
