'use client';

import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { useAppConfig } from '@/features/app';
import { StatusBadge, statusOf } from '@/features/episode';
import { cn } from '@/lib/utils';
import type { EpisodeView } from '@/server/modules/episode/episode.types';

import { useSeriesAction, useSeriesEpisodes } from '../hooks/use-series';
import { COLUMNS, columnOf, type ColumnId } from '../lib/rules';
import { seriesApi, type SeriesView } from '../services/series.api';

function EpisodeFormDialog({ title, description, initial, submitLabel, onSubmit, pending, onClose }: { title: string; description: string; initial: { topic: string; goal: string }; submitLabel: string; onSubmit: (v: { topic: string; goal: string }) => void; pending: boolean; onClose: () => void }) {
  const [topic, setTopic] = useState(initial.topic);
  const [goal, setGoal] = useState(initial.goal);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length >= 3) onSubmit({ topic: topic.trim(), goal: goal.trim() });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-topic">Chủ đề tập</Label>
            <Input id="ep-topic" autoFocus value={topic} maxLength={300} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Số 5 và những ngôi sao" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-goal">Mục tiêu (bé học được gì)</Label>
            <Input id="ep-goal" value={goal} maxLength={300} onChange={(e) => setGoal(e.target.value)} placeholder="VD: Đếm đến 5, nhận biết số 5" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={topic.trim().length < 3 || pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlannedCard({ v, selected, onSelect, first, last, onMove, onEdit, onRemove }: { v: EpisodeView; selected: boolean; onSelect: (on: boolean) => void; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void; onEdit: () => void; onRemove: () => void }) {
  const e = v.episode;
  return (
    <li className={cn('flex flex-col gap-2 rounded-xl border bg-card p-3', selected && 'border-primary ring-2 ring-accent')}>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" checked={selected} onChange={(ev) => onSelect(ev.target.checked)} aria-label={`Chọn tập ${e.number}`} className="mt-1 size-4 accent-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-caption text-muted-foreground">TẬP {e.number}</div>
          <div className="font-bold leading-snug">{e.topic}</div>
          {e.goal ? <p className="mt-0.5 text-caption text-muted-foreground">Mục tiêu: {e.goal}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-0.5">
        <Button variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Đưa tập ${e.number} lên`} disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Đưa tập ${e.number} xuống`} disabled={last} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Sửa tập ${e.number}`} onClick={onEdit}>
          <Pencil aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="size-10 md:size-8" aria-label={`Xoá tập ${e.number}`} onClick={onRemove}>
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}

function ProgressCard({ v }: { v: EpisodeView }) {
  const e = v.episode;
  const status = statusOf(v);
  const warn = v.job?.state === 'failed' ? v.job.error : null;
  return (
    <li>
      <Link href={ROUTES.episode(e.id)} className="flex flex-col gap-2 rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring">
        <div className="font-mono text-caption text-muted-foreground">TẬP {e.number}</div>
        <div className="font-bold leading-snug">{e.title || e.topic}</div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {v.job && v.job.state !== 'failed' && v.job.progress > 0 ? <span className="text-caption text-muted-foreground">{Math.round(v.job.progress * 100)}%</span> : null}
        </div>
        {warn ? <p className="text-caption text-destructive">{warn}</p> : null}
        <span className="text-small font-semibold text-primary">{status.next}</span>
      </Link>
    </li>
  );
}

/** The series as a work board: roadmap → writing → review → production → done. */
export function RoadmapBoard({ series }: { series: SeriesView }) {
  const { data: episodes, isLoading } = useSeriesEpisodes(series.id);
  const { data: config } = useAppConfig();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'edit'; v: EpisodeView } | null>(null);
  const aiReady = config?.llm.ready ?? true;

  const add = useSeriesAction(series.id, (v: { topic: string; goal: string }) => seriesApi.addEpisode(series.channelId, series.id, v.topic, v.goal), 'Đã thêm tập vào lộ trình');
  const edit = useSeriesAction(series.id, (arg: { id: string; topic: string; goal: string }) => seriesApi.editEpisode(arg.id, { topic: arg.topic, goal: arg.goal }), 'Đã lưu tập');
  const remove = useSeriesAction(series.id, (id: string) => seriesApi.removeEpisode(id), 'Đã xoá tập');
  const reorder = useSeriesAction(series.id, (ids: string[]) => seriesApi.reorder(series.id, ids));
  const write = useSeriesAction(series.id, (ids: string[]) => seriesApi.write(series.id, ids));

  const grouped = useMemo(() => {
    const out: Record<ColumnId, EpisodeView[]> = { planned: [], writing: [], review: [], producing: [], done: [] };
    for (const v of episodes ?? []) out[columnOf(v)].push(v);
    return out;
  }, [episodes]);

  if (isLoading) return <Skeleton className="h-72 rounded-2xl" />;
  const planned = grouped.planned;
  const chosen = planned.filter((v) => selected.has(v.episode.id));
  const move = (i: number, dir: -1 | 1) => {
    const ids = planned.map((v) => v.episode.id);
    const [id] = ids.splice(i, 1);
    ids.splice(i + dir, 0, id!);
    reorder.mutate(ids);
  };
  const toggleAll = () => setSelected(chosen.length === planned.length ? new Set() : new Set(planned.map((v) => v.episode.id)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!chosen.length || write.isPending || !aiReady}
          onClick={() =>
            write.mutate(
              chosen.map((v) => v.episode.id),
              { onSuccess: () => setSelected(new Set()) },
            )
          }
        >
          {write.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {chosen.length ? `Viết kịch bản cho ${chosen.length} tập` : 'Chọn tập trong lộ trình để viết'}
        </Button>
        {planned.length ? (
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {chosen.length === planned.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
        ) : null}
        <Button variant="outline" className="ml-auto" onClick={() => setDialog({ kind: 'add' })}>
          <Plus aria-hidden />
          Thêm tập
        </Button>
        {!aiReady ? <p className="basis-full text-small text-muted-foreground">Chưa cài AI: mở từng tập để dán kịch bản, hoặc cài AI ở trang Cài đặt để viết hàng loạt. Worker viết lần lượt từng tập, kèm bộ nhớ các tập đã duyệt.</p> : <p className="basis-full text-small text-muted-foreground">Worker viết lần lượt từng tập, mỗi tập đọc bộ nhớ của các tập đã duyệt trước đó.</p>}
      </div>

      <div className="md:-mx-1 md:overflow-x-auto md:px-1 md:pb-2">
        <div className="grid grid-cols-1 gap-4 md:min-w-[1100px] md:grid-cols-5">
          {COLUMNS.map((c) => (
            <section key={c.id} aria-labelledby={`col-${c.id}`} className={cn('flex-col gap-3 rounded-2xl bg-muted/50 p-3', grouped[c.id].length ? 'flex' : 'hidden md:flex')}>
              <header className="flex items-baseline justify-between gap-2 px-1">
                <h3 id={`col-${c.id}`} className="text-small font-extrabold uppercase tracking-wide">
                  {c.label}
                </h3>
                <span className="text-small font-semibold text-muted-foreground">{grouped[c.id].length}</span>
              </header>
              <ul className="flex flex-col gap-2.5">
                {grouped[c.id].length === 0 ? <li className="px-1 py-4 text-center text-caption text-muted-foreground">{c.hint}</li> : null}
                {c.id === 'planned'
                  ? planned.map((v, i) => (
                      <PlannedCard
                        key={v.episode.id}
                        v={v}
                        selected={selected.has(v.episode.id)}
                        onSelect={(on) =>
                          setSelected((cur) => {
                            const next = new Set(cur);
                            if (on) next.add(v.episode.id);
                            else next.delete(v.episode.id);
                            return next;
                          })
                        }
                        first={i === 0}
                        last={i === planned.length - 1}
                        onMove={(d) => move(i, d)}
                        onEdit={() => setDialog({ kind: 'edit', v })}
                        onRemove={() => remove.mutate(v.episode.id)}
                      />
                    ))
                  : grouped[c.id].map((v) => <ProgressCard key={v.episode.id} v={v} />)}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {dialog?.kind === 'add' ? (
        <EpisodeFormDialog title="Thêm tập vào lộ trình" description="Tập mới nằm cuối lộ trình, chưa viết kịch bản." initial={{ topic: '', goal: '' }} submitLabel="Thêm tập" pending={add.isPending} onClose={() => setDialog(null)} onSubmit={(v) => add.mutate(v, { onSuccess: () => setDialog(null) })} />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <EpisodeFormDialog
          title={`Sửa tập ${dialog.v.episode.number}`}
          description="Chủ đề và mục tiêu này được đưa cho AI khi viết kịch bản."
          initial={{ topic: dialog.v.episode.topic, goal: dialog.v.episode.goal }}
          submitLabel="Lưu"
          pending={edit.isPending}
          onClose={() => setDialog(null)}
          onSubmit={(v) => edit.mutate({ id: dialog.v.episode.id, ...v }, { onSuccess: () => setDialog(null) })}
        />
      ) : null}
    </div>
  );
}
