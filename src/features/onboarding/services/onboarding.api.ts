import { api } from '@/lib/api/client';

export const onboardingApi = {
  get: () => api<{ dismissed: boolean }>('/settings/onboarding'),
  set: (dismissed: boolean) => api<{ dismissed: boolean }>('/settings/onboarding', { method: 'PUT', body: { dismissed } }),
};
