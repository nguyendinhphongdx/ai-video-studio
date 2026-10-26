'use client';

import { Archive, ArchiveRestore, Download, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { activeSlots } from '@/core/series/format';

import { useSeriesAction, useSeriesEpisodes, useSeriesVersions } from '../hooks/use-series';
import { exportUrl, seriesApi, type SeriesView } from '../services/series.api';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'success' }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <div className={tone === 'warning' && value > 0 ? 'text-h2 font-extrabold text-warning' : tone === 'success' ? 'text-h2 font-extrabold text-success' : 'text-h2 font-extrabold'}>{value}</div>
      <div className="text-small text-muted-foreground">{label}</div>
    </div>
  );
}

export function OverviewTab({ series, onGo }: { series: SeriesView; onGo: (tab: string) => void }) {
  const { data: episodes } = useSeriesEpisodes(series.id);
  const { data: versions } = useSeriesVersions(series.id);
  const archive = useSeriesAction(series.id, () => seriesApi.update(series.id, { status: series.status === 'active' ? 'archived' : 'active' }));
  const st = series.stats;
  const review = st.script_review + st.video_review;
  const next = useMemo(() => (episodes ?? []).find((v) => v.episode.status === 'planned'), [episodes]);
  const firstReview = (episodes ?? []).find((v) => v.episode.status === 'script_review' || v.episode.status === 'video_review');
  const { bible, format } = series.rules;
  const slots = activeSlots(format, 2);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Trong lộ trình" value={st.planned} />
          <Stat label="Đang viết / sản xuất" value={st.draft + st.producing} />
          <Stat label="Chờ bạn duyệt" value={review} tone="warning" />
          <Stat label="Xong" value={st.published} tone="success" />
        </div>
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5" aria-labelledby="next-h">
          <h2 id="next-h" className="text-h3 font-bold">
            Việc tiếp theo
          </h2>
          {firstReview ? (
            <p className="text-small">
              Tập {firstReview.episode.number} “{firstReview.episode.title || firstReview.episode.topic}” đang chờ bạn duyệt.{' '}
              <Link href={ROUTES.episode(firstReview.episode.id)} className="font-semibold text-primary hover:underline">
                Mở để duyệt
              </Link>
            </p>
          ) : null}
          {next ? (
            <p className="text-small">
              Tập tiếp theo trong lộ trình: tập {next.episode.number} “{next.episode.topic}”.{' '}
              <button type="button" onClick={() => onGo('episodes')} className="font-semibold text-primary hover:underline">
                Viết kịch bản
              </button>
            </p>
          ) : null}
          {!firstReview && !next ? (
            <p className="text-small text-muted-foreground">
              Lộ trình đã hết tập chưa viết.{' '}
              <button type="button" onClick={() => onGo('episodes')} className="font-semibold text-primary hover:underline">
                Thêm tập mới
              </button>
            </p>
          ) : null}
        </section>
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5" aria-labelledby="frame-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="frame-h" className="text-h3 font-bold">
              Khung một tập (từ tập 2)
            </h2>
            <button type="button" onClick={() => onGo('format')} className="text-small font-semibold text-primary hover:underline">
              Sửa khung
            </button>
          </div>
          <ol className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-small font-semibold">
                {s.fill === 'locked' ? <Lock className="size-3.5 text-muted-foreground" aria-label="Khoá" /> : <Sparkles className="size-3.5 text-primary" aria-label="AI điền" />}
                {s.name}
                {s.fill === 'ai' ? <span className="font-normal text-muted-foreground">{s.scenes.min === s.scenes.max ? s.scenes.min : `${s.scenes.min}-${s.scenes.max}`} cảnh</span> : null}
              </li>
            ))}
          </ol>
          {format.durationSec ? (
            <p className="text-small text-muted-foreground">
              Thời lượng {format.durationSec.min}–{format.durationSec.max} giây.
            </p>
          ) : null}
        </section>
      </div>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2 rounded-2xl border bg-card p-5" aria-labelledby="bible-sum-h">
          <h2 id="bible-sum-h" className="text-h3 font-bold">
            Chương trình
          </h2>
          <p className="text-small">{bible.premise || <span className="text-muted-foreground">Chưa có ý tưởng chương trình.</span>}</p>
          {bible.host ? (
            <p className="text-small">
              <span className="text-muted-foreground">Nhân vật dẫn: </span>
              {bible.host}
            </p>
          ) : null}
          {bible.catchphrases.length ? <p className="text-small text-muted-foreground">Câu cửa miệng: {bible.catchphrases.map((c) => `“${c}”`).join(' · ')}</p> : null}
        </section>
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5" aria-labelledby="ver-h">
          <h2 id="ver-h" className="text-h3 font-bold">
            Phiên bản
          </h2>
          {!versions ? (
            <Skeleton className="h-16" />
          ) : (
            <ol className="flex flex-col gap-1.5 text-small">
              {versions.map((v) => (
                <li key={v.version} className="flex items-baseline justify-between gap-3">
                  <span className={v.version === series.currentVersion ? 'font-bold' : ''}>
                    v{v.version}
                    {v.version === series.currentVersion ? ' · đang dùng' : ''}
                  </span>
                  <time className="text-caption text-muted-foreground">{new Date(v.createdAt).toLocaleString('vi-VN')}</time>
                </li>
              ))}
            </ol>
          )}
          <p className="text-caption text-muted-foreground">Mỗi tập ghim phiên bản lúc viết kịch bản, nên sửa khung không làm hỏng các tập đã xong.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={exportUrl(series.id)} download>
                <Download aria-hidden />
                Xuất file series
              </a>
            </Button>
            <Button variant="ghost" size="sm" disabled={archive.isPending} onClick={() => archive.mutate(undefined)}>
              {series.status === 'active' ? <Archive aria-hidden /> : <ArchiveRestore aria-hidden />}
              {series.status === 'active' ? 'Lưu trữ series' : 'Mở lại series'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
