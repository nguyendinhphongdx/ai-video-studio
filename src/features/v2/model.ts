import type { EpisodeStatus } from '@/core/domain';

/** v2 calls a channel a "project": it owns its episodes, library, style, skills and settings. */
export const projectHref = (projectId: string, sub = '') => `/projects/${projectId}${sub ? `/${sub}` : ''}`;

/** What a person does with an episode: shape it scene by scene, watch the video, publish it. */
export const EPISODE_STEPS = [
  { key: 'script', label: 'Kịch bản và cảnh' },
  { key: 'review', label: 'Video' },
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

/** A scene still lacks something to be seen or heard: urls only exist for files that match the scene. */
export const lacksImage = (a: { needsImage: boolean; imageUrl: string | null } | undefined) => Boolean(a?.needsImage && !a.imageUrl);
export const lacksVoice = (a: { needsVoice: boolean; voiceUrl: string | null } | undefined) => Boolean(a?.needsVoice && !a.voiceUrl);
