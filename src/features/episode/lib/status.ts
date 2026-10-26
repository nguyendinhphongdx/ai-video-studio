import type { EpisodeStatus } from '@/core/domain';

import type { EpisodeView } from '../services/episode.api';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface StatusInfo {
  label: string;
  tone: Tone;
  /** What the person should do next, as a link label. */
  next: string;
}

const STATUS: Record<EpisodeStatus, StatusInfo> = {
  planned: { label: 'Trong lộ trình', tone: 'neutral', next: 'Viết kịch bản' },
  draft: { label: 'Chờ kịch bản', tone: 'warning', next: 'Viết hoặc dán kịch bản' },
  script_review: { label: 'Chờ duyệt kịch bản', tone: 'warning', next: 'Duyệt kịch bản' },
  producing: { label: 'Đang sản xuất', tone: 'info', next: 'Xem tiến độ' },
  video_review: { label: 'Chờ duyệt video', tone: 'warning', next: 'Xem & duyệt video' },
  published: { label: 'Sẵn sàng đăng', tone: 'success', next: 'Lấy nội dung đăng' },
};

export function statusOf(v: EpisodeView): StatusInfo {
  const job = v.job;
  if (job?.state === 'failed') return { label: 'Bị lỗi', tone: 'danger', next: 'Xem lỗi & thử lại' };
  if (job && job.kind !== 'produce' && job.kind !== 'summarize') return { label: job.kind === 'revise_script' ? 'AI đang sửa' : 'AI đang viết', tone: 'info', next: 'Xem tiến độ' };
  return STATUS[v.episode.status];
}

export const needsReview = (v: EpisodeView) => v.job?.state === 'failed' || (!v.job && ['draft', 'script_review', 'video_review'].includes(v.episode.status));

/** Which studio step a status belongs to. */
export function stageOf(status: EpisodeStatus): 'script' | 'produce' | 'publish' {
  if (status === 'producing' || status === 'video_review') return 'produce';
  if (status === 'published') return 'publish';
  return 'script';
}

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-destructive',
};

export const fmtDuration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)} giây`);

export function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
