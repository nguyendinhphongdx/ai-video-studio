'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/features/app';

import { settingsApi } from '../services/settings.service';

export function useLlmSettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.llmSettings, queryFn: settingsApi.llm });
  const save = useMutation({
    mutationFn: settingsApi.saveLlm,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.llmSettings, data);
      void qc.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
  const test = useMutation({ mutationFn: settingsApi.testLlm });
  return { query, save, test };
}
