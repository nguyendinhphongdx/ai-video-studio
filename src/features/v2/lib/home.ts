import type { EpisodeView } from '@/features/episode/services/episode.api';

export interface ProjectSummary {
  total: number;
  published: number;
  producing: number;
  /** Waiting for the person: script or video to approve. */
  waiting: number;
  failed: number;
  /** Planned or draft. */
  early: number;
  /** ISO time of the newest change, if any episode exists. */
  lastAt: string | null;
}

const running = (v: EpisodeView) => v.job?.state === 'queued' || v.job?.state === 'running';

/** What a project's episodes add up to, for its card. A failed job counts as failed, not as its status. */
export function summarize(eps: EpisodeView[]): ProjectSummary {
  const s: ProjectSummary = { total: eps.length, published: 0, producing: 0, waiting: 0, failed: 0, early: 0, lastAt: null };
  for (const v of eps) {
    const st = v.episode.status;
    if (v.job?.state === 'failed') s.failed++;
    else if (st === 'published') s.published++;
    else if (st === 'script_review' || st === 'video_review') s.waiting++;
    else if (st === 'producing' || running(v)) s.producing++;
    else s.early++;
    if (!s.lastAt || v.episode.updatedAt > s.lastAt) s.lastAt = v.episode.updatedAt;
  }
  return s;
}

/** "5 phút trước", "3 giờ trước", "Hôm qua", or the date for anything older than a week. */
export function relTime(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Chưa có hoạt động';
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  if (min < 1440) return `${Math.floor(min / 60)} giờ trước`;
  const days = Math.floor(min / 1440);
  return days === 1 ? 'Hôm qua' : days < 7 ? `${days} ngày trước` : new Date(iso).toLocaleDateString('vi-VN');
}

/** What to press for an episode that waits on the person. */
export function actionFor(v: EpisodeView): string {
  if (v.job?.state === 'failed') return 'Xem lỗi';
  return v.episode.status === 'video_review' ? 'Duyệt video' : 'Duyệt kịch bản';
}
