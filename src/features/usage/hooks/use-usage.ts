'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/lib/api/client';

import { usageApi, usageKeys, type BudgetInput, type PriceRow, type UsageRange } from '../services/usage.api';

export const useUsageSummary = (range: UsageRange) => useQuery({ queryKey: usageKeys.summary(range), queryFn: () => usageApi.summary(range), refetchInterval: 15_000 });

export function usePrices() {
  return useQuery({ queryKey: usageKeys.prices, queryFn: usageApi.prices });
}

/** Mutations that change what the Cost screen shows: refresh all of it afterwards. */
export function useUsageActions() {
  const qc = useQueryClient();
  const done = (message?: string) => () => {
    void qc.invalidateQueries({ queryKey: usageKeys.all });
    if (message) toast.success(message);
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));
  return {
    saveBudget: useMutation({ mutationFn: (b: BudgetInput) => usageApi.saveBudget(b), onSuccess: done('Đã lưu ngân sách'), onError }),
    removeBudget: useMutation({ mutationFn: (id: string) => usageApi.removeBudget(id), onSuccess: done('Đã xoá ngân sách'), onError }),
    saveFx: useMutation({ mutationFn: (fx: number) => usageApi.saveFx(fx), onSuccess: done('Đã lưu tỷ giá'), onError }),
    savePrices: useMutation({ mutationFn: (rows: Omit<PriceRow, 'id'>[]) => usageApi.savePrices(rows), onSuccess: done('Đã lưu bảng giá. Chi phí đã ghi giữ nguyên giá lúc gọi.'), onError }),
    resetPrices: useMutation({ mutationFn: () => usageApi.resetPrices(), onSuccess: done('Đã khôi phục giá mặc định'), onError }),
  };
}

/** Expected cost of a batch of pictures and voices (nothing is called). null while loading or when no price is known. */
export function useEstimate(images: number, texts: string[], voice: string) {
  const key = `${images}|${voice}|${texts.join('\u0001')}`;
  const q = useQuery({ queryKey: ['usage', 'estimate', key], queryFn: () => usageApi.estimate({ images, texts, voice }), enabled: images > 0 || texts.length > 0, staleTime: 60_000 });
  return q.data ?? null;
}
