'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { onboardingApi } from '../services/onboarding.api';

const KEY = ['settings', 'onboarding'] as const;

export function useOnboarding() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: KEY, queryFn: onboardingApi.get });
  const set = useMutation({ mutationFn: onboardingApi.set, onSuccess: (v) => qc.setQueryData(KEY, v) });
  return { loaded: data !== undefined, dismissed: data?.dismissed ?? true, setDismissed: (v: boolean) => set.mutate(v) };
}
