'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileUp, ListVideo, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useCurrentChannel } from '@/features/app';
import { errorMessage } from '@/lib/api/client';

import { useSeriesList } from '../hooks/use-series';
import { seriesApi, type SeriesFile, type SeriesView } from '../services/series.api';

function SeriesCard({ s }: { s: SeriesView }) {
  const st = s.stats;
  const waiting = st.script_review + st.video_review;
  const pct = st.total ? Math.round((st.published / st.total) * 100) : 0;
  return (
    <Link href={ROUTES.seriesOf(s.id)} className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-h3 font-bold leading-snug">{s.name}</h2>
          <p className="mt-1 line-clamp-2 text-small text-muted-foreground">{s.rules.bible.premise || 'Chưa có ý tưởng chương trình.'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-caption font-bold text-accent-foreground">v{s.currentVersion}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ series">
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 text-small text-muted-foreground">
          <span>
            {st.published}/{st.total} tập xong
          </span>
          {waiting ? <span className="font-semibold text-warning">{waiting} chờ duyệt</span> : null}
          {st.planned ? <span>{st.planned} trong lộ trình</span> : null}
          {s.status === 'archived' ? <span>Đã lưu trữ</span> : null}
        </div>
      </div>
      <span className="mt-auto flex items-center gap-1 text-small font-semibold text-primary">
        Mở series
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

export function SeriesListView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { current } = useCurrentChannel();
  const { data: list, isLoading } = useSeriesList(current?.id);
  const input = useRef<HTMLInputElement>(null);
  const importFile = useMutation({
    mutationFn: async (file: File) => seriesApi.importFile(current!.id, JSON.parse(await file.text()) as SeriesFile),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['series'] });
      toast.success(`Đã nhập series “${s.name}”`);
      router.push(ROUTES.seriesOf(s.id));
    },
    onError: (e) => toast.error(e instanceof SyntaxError ? 'File không phải JSON hợp lệ' : errorMessage(e)),
  });
  const items = list ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Series"
        description={`Chương trình định kỳ của kênh ${current?.name ?? ''}: bible, khung tập, lộ trình và bộ nhớ giữ cho các tập nhất quán.`}
        actions={
          <>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Chọn file series để nhập"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) importFile.mutate(f);
              }}
            />
            <Button variant="outline" disabled={!current || importFile.isPending} onClick={() => input.current?.click()}>
              <FileUp aria-hidden />
              Nhập file
            </Button>
            <Button asChild disabled={!current}>
              <Link href={ROUTES.seriesNew}>
                <Plus aria-hidden />
                Tạo series
              </Link>
            </Button>
          </>
        }
      />
      {isLoading ? <Skeleton className="h-48 rounded-2xl" /> : null}
      {!isLoading && !items.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <ListVideo className="size-8 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-small text-muted-foreground">Chưa có series nào. Làm một chương trình nhiều tập để AI giữ nhân vật, câu cửa miệng và nối tiếp bài giữa các tập. Nhanh nhất là nhờ trợ lý (nút ✨) lập series giúp bạn.</p>
          <Button asChild>
            <Link href={ROUTES.seriesNew}>Tạo series đầu tiên</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SeriesCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
