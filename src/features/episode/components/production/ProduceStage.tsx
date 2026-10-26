'use client';

import { Check, Download, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Progress } from '@/components/animate-ui/components/radix/progress';
import { CountingNumber } from '@/components/animate-ui/primitives/texts/counting-number';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/constants/routes';
import { FORMATS } from '@/core/domain/catalog';
import { cn } from '@/lib/utils';

import { isBusy, useEpisodeAction } from '../../hooks/use-episode';
import { fmtDuration } from '../../lib/status';
import { episodeApi, type EpisodeView } from '../../services/episode.api';

// Same ids as src/core/pipeline/steps (shown in order).
const STEPS = [
  { id: 'voice', label: 'Lồng tiếng từng cảnh' },
  { id: 'render', label: 'Dựng từng cảnh bằng tool của cảnh' },
  { id: 'assemble', label: 'Ghép video + nhạc nền' },
  { id: 'thumbnail', label: 'Ảnh thu nhỏ' },
  { id: 'quality', label: 'Kiểm tra tự động' },
];

function Progressing({ view }: { view: EpisodeView }) {
  const job = view.job!;
  const pct = Math.round(job.progress * 100);
  const current = STEPS.findIndex((s) => s.id === job.phase);
  return (
    <section aria-live="polite" className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-8">
      <div className="flex flex-col gap-4">
        <span className="text-small font-semibold text-muted-foreground">{job.state === 'queued' ? 'Đang chờ tới lượt' : 'Đang sản xuất'}</span>
        <div className="text-[64px] font-extrabold leading-none tabular-nums">
          <CountingNumber number={pct} />%
        </div>
        <Progress value={pct} className="h-3" />
        <p className="text-small text-muted-foreground">Mỗi bản video ngắn mất khoảng 1–2 phút. Bạn có thể rời trang, video sẽ chờ bạn duyệt.</p>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const done = current > i || (current === -1 && job.phase === 'done');
          const now = current === i;
          return (
            <li key={s.id} className={cn('flex items-center gap-3 text-small font-semibold', done ? 'text-foreground' : now ? 'text-primary' : 'text-muted-foreground')}>
              <span className={cn('grid size-7 place-items-center rounded-full border', done ? 'border-success bg-success text-white' : now ? 'border-primary' : 'border-border')}>
                {done ? <Check className="size-4" aria-hidden /> : now ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const CHECKLIST = ['Lời đọc rõ, không bị cắt', 'Chữ trên màn hình đúng chính tả', 'Hình và lời đọc khớp nhau', 'Phù hợp lứa tuổi khán giả'];
const FEEDBACK = ['Lời đọc chậm hơn', 'Thêm 1 cảnh', 'Đổi màu nền'];

function Review({ view }: { view: EpisodeView }) {
  const router = useRouter();
  const id = view.episode.id;
  const [feedback, setFeedback] = useState('');
  const approve = useEpisodeAction(id, () => episodeApi.approveVideo(id), 'Đã duyệt video');
  const reject = useEpisodeAction(id, (f: string) => episodeApi.rejectVideo(id, f), 'Đã gửi AI sửa kịch bản');
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-wrap gap-4">
        {view.renders.map((r) => (
          <figure key={r.id} className={cn('flex flex-col gap-2 rounded-2xl border bg-card p-3', r.format === 'portrait' ? 'w-full max-w-[300px]' : 'w-full')}>
            <video controls preload="metadata" poster={r.thumbnailUrl ?? undefined} src={r.url} className="w-full rounded-lg bg-black" />
            <figcaption className="flex items-center gap-2 text-small">
              <b>{FORMATS[r.format].label}</b>
              <span className="text-muted-foreground">{fmtDuration(r.durationSec)}</span>
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <a href={r.url} download>
                  <Download aria-hidden />
                  Tải về
                </a>
              </Button>
            </figcaption>
          </figure>
        ))}
      </div>
      <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-4">
        <h2 className="text-title font-bold">Duyệt video</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small text-muted-foreground">Xem hết một lượt trước khi duyệt:</legend>
          {CHECKLIST.map((c) => (
            <label key={c} className="flex items-center gap-2.5 text-small">
              <input type="checkbox" className="size-4 accent-[var(--success)]" />
              {c}
            </label>
          ))}
        </fieldset>
        <Button size="lg" className="bg-success font-bold text-white hover:bg-success/90" onClick={() => approve.mutate(undefined, { onSuccess: () => router.push(`${ROUTES.episode(id)}/publish`) })} disabled={approve.isPending}>
          {approve.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          Duyệt video
        </Button>
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject">Chưa ưng? Ghi yêu cầu sửa</Label>
          <Textarea id="reject" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: lời đọc chậm hơn, thêm cảnh con mèo" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK.map((c) => (
            <button key={c} type="button" onClick={() => setFeedback((t) => (t ? `${t}, ${c.toLowerCase()}` : c))} className="rounded-full bg-muted px-2.5 py-1 text-caption hover:bg-accent">
              {c}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => reject.mutate(feedback, { onSuccess: () => router.push(ROUTES.episode(id)) })} disabled={reject.isPending}>
          <RotateCcw aria-hidden />
          Trả lại sửa
        </Button>
        <p className="text-caption text-muted-foreground">AI sửa kịch bản theo góp ý; bạn duyệt lại kịch bản rồi sản xuất lại. Các bước không đổi sẽ không phải làm lại.</p>
      </aside>
    </div>
  );
}

/** Step 2: production progress, then the video review. */
export function ProduceStage({ view }: { view: EpisodeView }) {
  if (view.job?.kind === 'produce' && isBusy(view)) return <Progressing view={view} />;
  if (view.episode.status === 'video_review' || view.episode.status === 'published') {
    return view.episode.status === 'published' ? (
      <div className="flex flex-col gap-4">
        <Review view={view} />
      </div>
    ) : (
      <Review view={view} />
    );
  }
  return (
    <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <p className="font-semibold">Chưa sản xuất</p>
      <p className="mt-1 text-small text-muted-foreground">Duyệt kịch bản để bắt đầu sản xuất video.</p>
      <Button asChild className="mt-4">
        <Link href={ROUTES.episode(view.episode.id)}>Về bước kịch bản</Link>
      </Button>
    </div>
  );
}
