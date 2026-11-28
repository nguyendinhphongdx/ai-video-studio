import Link from 'next/link';

import type { DataColumn, DataFilter } from '@/components/data-table';
import type { EpisodeStatus } from '@/core/domain';
import { estimateSpeechSec } from '@/core/timeline';
import type { EpisodeView } from '@/features/episode/services/episode.api';

import { currentStep, episodeHref, STATUS_CHIP, usd } from '../../model';

const ORDER: EpisodeStatus[] = ['planned', 'draft', 'script_review', 'producing', 'video_review', 'published'];

/** What the table shows for the state of a video: its job when one runs or failed, otherwise its status. */
export function statusOf(v: EpisodeView): { label: string; tone: string; detail: string | null } {
  const job = v.job;
  if (job?.state === 'failed') return { label: 'Lỗi', tone: 'err', detail: job.error };
  if (job && (job.state === 'queued' || job.state === 'running')) return { label: `Đang chạy · ${Math.round(job.progress * 100)}%`, tone: 'info', detail: job.phase };
  const s = STATUS_CHIP[v.episode.status];
  const scenes = v.episode.scenes;
  const approved = scenes.filter((x) => x.approved).length;
  // While the script is being worked on, how much of it the person has already approved.
  const detail = scenes.length && ['draft', 'script_review'].includes(v.episode.status) ? `Đã duyệt ${approved}/${scenes.length} cảnh` : null;
  return { label: s.label, tone: s.tone, detail };
}

/** Rough length from the narration (the real length is known only after the voice is made). */
export const estimatedSeconds = (v: EpisodeView) => Math.round(v.episode.scenes.reduce((sum, s) => sum + estimateSpeechSec(s.narration), 0));

export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const daysAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'Hôm nay' : days === 1 ? 'Hôm qua' : days < 7 ? `${days} ngày trước` : new Date(iso).toLocaleDateString('vi-VN');
};

export function episodeColumns(projectId: string, costs: Record<string, number> | undefined): DataColumn<EpisodeView>[] {
  const href = (v: EpisodeView) => episodeHref(projectId, v.episode.id, currentStep(v.episode.status));
  return [
    { id: 'number', header: 'Tập', width: 72, mono: true, cell: (v) => v.episode.number ?? '-', sortValue: (v) => v.episode.number },
    {
      id: 'title',
      header: 'Tiêu đề',
      cell: (v) => (
        <div className="eptitle">
          <Link href={href(v)}>{v.episode.title || v.episode.topic}</Link>
          {v.episode.title && v.episode.title !== v.episode.topic && <span className="cap">{v.episode.topic}</span>}
        </div>
      ),
      sortValue: (v) => v.episode.title || v.episode.topic,
    },
    { id: 'scenes', header: 'Cảnh', align: 'right', mono: true, hideBelow: 'sm', cell: (v) => v.episode.scenes.length || '-', sortValue: (v) => v.episode.scenes.length, footer: (rows) => rows.reduce((n, v) => n + v.episode.scenes.length, 0) },
    {
      id: 'duration',
      header: 'Thời lượng',
      align: 'right',
      mono: true,
      hideBelow: 'md',
      cell: (v) => (estimatedSeconds(v) ? `~${clock(estimatedSeconds(v))}` : '-'),
      sortValue: (v) => estimatedSeconds(v) || null,
      footer: (rows) => `~${clock(rows.reduce((n, v) => n + estimatedSeconds(v), 0))}`,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (v) => {
        const s = statusOf(v);
        return (
          <div className="epstatus">
            <span className={`chip ${s.tone}`}>
              <i />
              {s.label}
            </span>
            {s.detail && <span className="cap">{s.detail}</span>}
          </div>
        );
      },
      sortValue: (v) => ORDER.indexOf(v.episode.status),
    },
    { id: 'cost', header: 'Chi phí', align: 'right', mono: true, hideBelow: 'md', cell: (v) => (costs?.[v.episode.id] ? usd(costs[v.episode.id]!) : '-'), sortValue: (v) => costs?.[v.episode.id] ?? null, footer: (rows) => usd(rows.reduce((n, v) => n + (costs?.[v.episode.id] ?? 0), 0)) },
    { id: 'updated', header: 'Cập nhật', hideBelow: 'sm', cell: (v) => <span className="cap">{daysAgo(v.episode.updatedAt)}</span>, sortValue: (v) => v.episode.updatedAt },
  ];
}

export const statusFilter: DataFilter<EpisodeView> = {
  id: 'status',
  label: 'Trạng thái',
  options: ORDER.map((s) => ({ value: s, label: STATUS_CHIP[s].label, match: (v: EpisodeView) => v.episode.status === s })),
};

/** Tiles above the table: where the project stands. */
export function episodeStats(list: EpisodeView[], costs: Record<string, number> | undefined) {
  const n = (...s: EpisodeStatus[]) => list.filter((v) => s.includes(v.episode.status)).length;
  return {
    total: list.length,
    waiting: n('script_review', 'video_review'),
    producing: n('producing'),
    published: n('published'),
    planned: n('planned'),
    cost: Object.values(costs ?? {}).reduce((a, b) => a + b, 0),
  };
}
