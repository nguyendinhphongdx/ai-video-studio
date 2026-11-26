import type { EpisodeStatus } from '@/core/domain';

/** v2 calls a channel a "project": it owns its episodes, library, style, skills and settings. */
export const projectHref = (projectId: string, sub = '') => `/v2/projects/${projectId}${sub ? `/${sub}` : ''}`;

export const EPISODE_STEPS = [
  { key: 'script', label: 'Kịch bản' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'production', label: 'Sản xuất' },
  { key: 'review', label: 'Duyệt' },
  { key: 'publish', label: 'Xuất bản' },
] as const;
export type EpisodeStep = (typeof EPISODE_STEPS)[number]['key'];

export const episodeHref = (projectId: string, episodeId: string, step: EpisodeStep = 'script') => projectHref(projectId, `episodes/${episodeId}/${step}`);

/** The step an episode is at, from its status. Steps before it count as done. */
export function currentStep(status: EpisodeStatus): EpisodeStep {
  switch (status) {
    case 'planned':
    case 'draft':
    case 'script_review':
      return 'script';
    case 'producing':
      return 'production';
    case 'video_review':
      return 'review';
    case 'published':
      return 'publish';
  }
}

export const stepIndex = (s: EpisodeStep) => EPISODE_STEPS.findIndex((x) => x.key === s);

export const STATUS_CHIP: Record<EpisodeStatus, { label: string; tone: '' | 'ok' | 'warn' | 'info' | 'acc' }> = {
  planned: { label: 'Đã lên kế hoạch', tone: '' },
  draft: { label: 'Nháp', tone: '' },
  script_review: { label: 'Chờ duyệt kịch bản', tone: 'warn' },
  producing: { label: 'Đang sản xuất', tone: 'info' },
  video_review: { label: 'Chờ duyệt video', tone: 'warn' },
  published: { label: 'Đã xuất bản', tone: 'ok' },
};

export const usd = (n: number) => `$${n.toFixed(2).replace('.', ',')}`;
