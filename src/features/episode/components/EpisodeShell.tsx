'use client';

import { useFollowChannel } from '@/features/app';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Brain, CircleAlert, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import { episodeKeys, isBusy, useEpisode, useEpisodeAction } from '../hooks/use-episode';
import { stageOf, statusOf } from '../lib/status';
import { episodeApi, type EpisodeView } from '../services/episode.api';

import { StatusBadge } from './StatusBadge';

export type Stage = 'script' | 'produce' | 'publish';

const STEPS: { id: Stage; label: string; path: (id: string) => string }[] = [
  { id: 'script', label: 'Kịch bản', path: (id) => ROUTES.episode(id) },
  { id: 'produce', label: 'Sản xuất', path: (id) => `${ROUTES.episode(id)}/produce` },
  { id: 'publish', label: 'Đăng bài', path: (id) => `${ROUTES.episode(id)}/publish` },
];
const ORDER: Stage[] = ['script', 'produce', 'publish'];

function StepNav({ view, stage }: { view: EpisodeView; stage: Stage }) {
  const reached = ORDER.indexOf(stageOf(view.episode.status));
  return (
    <nav aria-label="Các bước" className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => {
        const enabled = i <= reached;
        const done = i < reached || view.episode.status === 'published';
        const here = s.id === stage;
        const inner = (
          <>
            <span className={cn('grid size-6 place-items-center rounded-full text-caption font-bold', here ? 'bg-primary text-primary-foreground' : done ? 'bg-success text-white' : 'bg-muted text-muted-foreground')}>
              {done && !here ? '✓' : i + 1}
            </span>
            {s.label}
          </>
        );
        return (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 ? <span className={cn('h-px w-6 md:w-10', i <= reached ? 'bg-success' : 'bg-border')} aria-hidden /> : null}
            {enabled ? (
              <Link href={s.path(view.episode.id)} aria-current={here ? 'step' : undefined} className={cn('flex min-h-10 items-center gap-2 rounded-full px-2 text-small font-semibold', here ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {inner}
              </Link>
            ) : (
              <span className="flex min-h-10 items-center gap-2 px-2 text-small font-semibold text-muted-foreground/60">{inner}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function JobBanner({ view }: { view: EpisodeView }) {
  const retry = useEpisodeAction(view.episode.id, () => episodeApi.retry(view.episode.id), 'Đã chạy lại');
  const job = view.job;
  if (!job || job.state !== 'failed') return null;
  const where = { write_script: 'AI viết kịch bản', revise_script: 'AI sửa kịch bản', produce: 'sản xuất video', summarize: 'ghi bộ nhớ series', generate_art: 'tạo ảnh nền', scene_assets: 'tạo ảnh và giọng đọc', assistant_turn: 'trợ lý' }[job.kind];
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl bg-danger-soft px-4 py-3.5 text-destructive">
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Lỗi ở bước {where}</div>
        <div className="text-small">{job.error}</div>
      </div>
      <Button variant="outline" size="sm" onClick={() => retry.mutate(undefined)} disabled={retry.isPending}>
        {retry.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
        Thử lại
      </Button>
    </div>
  );
}

/** The channel's knowledge changed after this script was written: offer to write it again with the new knowledge. */
function KnowledgeBanner({ view }: { view: EpisodeView }) {
  const rewrite = useEpisodeAction(view.episode.id, () => episodeApi.writeScript(view.episode.id), 'AI đang viết lại theo tri thức mới');
  const { used, current } = view.knowledge;
  const editable = view.episode.status === 'script_review' || view.episode.status === 'draft';
  if (!editable || isBusy(view) || used === null || current === null || current <= used) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-info-soft px-4 py-3 text-small text-info">
      <span className="min-w-0 flex-1">
        Tri thức của kênh đã cập nhật (kịch bản này viết với v{used}, hiện là v{current}). Viết lại để dùng tri thức mới; các cảnh hiện tại sẽ được thay.
      </span>
      <Button variant="outline" size="sm" onClick={() => rewrite.mutate(undefined)} disabled={rewrite.isPending}>
        {rewrite.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
        Viết lại theo tri thức mới
      </Button>
    </div>
  );
}

function AiContextDialog({ id }: { id: string }) {
  const runs = useQuery({ queryKey: episodeKeys.aiRuns(id), queryFn: () => episodeApi.aiRuns(id) });
  const run = runs.data?.[0];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void runs.refetch()}>
          <Brain aria-hidden />
          AI đã thấy gì
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Ngữ cảnh của lần gọi AI gần nhất</DialogTitle>
          <DialogDescription>
            {run ? `${run.task} · ${run.model ?? 'không rõ model'} · ${(run.durationMs / 1000).toFixed(1)} giây${run.error ? ` · lỗi: ${run.error}` : ''}` : 'Chưa có lần gọi AI nào cho video này.'}
          </DialogDescription>
        </DialogHeader>
        {run ? (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {run.sections.map((s) => (
                <span key={s.id} className="rounded-full bg-muted px-2.5 py-0.5 text-caption">
                  {s.title} · {s.chars} ký tự{s.truncated ? ' (rút gọn)' : ''}
                </span>
              ))}
            </div>
            <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-caption leading-relaxed">{`${run.context}\n\n## Nhiệm vụ\n${run.prompt}`}</pre>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EventLog({ view }: { view: EpisodeView }) {
  return (
    <details className="rounded-xl border bg-card px-4 py-3 text-small">
      <summary className="cursor-pointer font-semibold text-muted-foreground">Nhật ký ({view.events.length})</summary>
      <ol className="mt-3 flex max-h-60 flex-col gap-1 overflow-auto text-caption text-slate-700">
        {[...view.events].reverse().map((e, i) => (
          <li key={i}>
            <time className="text-muted-foreground">{new Date(e.at).toLocaleString('vi-VN')}</time> · {e.message}
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Shared frame of the three studio steps. `children` receives the live episode. */
export function EpisodeShell({ id, stage, children }: { id: string; stage: Stage; children: (view: EpisodeView) => ReactNode }) {
  const { data: view, error } = useEpisode(id);
  useFollowChannel(view?.episode.channelId);
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!view) return <Skeleton className="h-96 rounded-2xl" />;
  const e = view.episode;
  const expected = stageOf(e.status);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href={e.seriesId ? ROUTES.seriesOf(e.seriesId) : ROUTES.library} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {e.seriesId ? 'Về series' : 'Thư viện'}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h2 font-extrabold">{e.title || e.topic}</h1>
            <p className="mt-1 text-small text-muted-foreground">
              {e.number !== null ? `Tập ${e.number} · ` : ''}Ý tưởng: {e.topic}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={statusOf(view)} />
            <AiContextDialog id={id} />
          </div>
        </div>
        <StepNav view={view} stage={stage} />
      </div>
      <JobBanner view={view} />
      <KnowledgeBanner view={view} />
      {expected !== stage && !isBusy(view) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-info-soft px-4 py-3 text-small text-info">
          <span className="flex-1">{expected === 'script' ? 'Video đang ở bước kịch bản.' : expected === 'produce' ? 'Video đang ở bước sản xuất / duyệt video.' : 'Video đã sẵn sàng để đăng.'}</span>
          <Link href={STEPS.find((s) => s.id === expected)!.path(id)} className="font-semibold underline-offset-2 hover:underline">
            Tới bước đó
          </Link>
        </div>
      ) : null}
      {children(view)}
      <EventLog view={view} />
    </div>
  );
}
