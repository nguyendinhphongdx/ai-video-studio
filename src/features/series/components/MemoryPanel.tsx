'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { EpisodeMemory } from '@/core/domain';

import { useSeriesAction, useSeriesMemory } from '../hooks/use-series';
import { seriesApi, type EpisodeMemoryPatch } from '../services/series.api';

import { ListInput } from './ListInput';

const LISTS = [
  { key: 'concepts', label: 'Kiến thức đã dạy' },
  { key: 'examples', label: 'Ví dụ, đồ vật, con vật đã dùng' },
  { key: 'vocabulary', label: 'Từ mới' },
  { key: 'jokes', label: 'Câu đùa, tình huống vui' },
] as const;

function Chips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-caption">
          {t}
        </span>
      ))}
    </div>
  );
}

function EditMemoryDialog({ seriesId, memory, onClose }: { seriesId: string; memory: EpisodeMemory; onClose: () => void }) {
  const [draft, setDraft] = useState<EpisodeMemoryPatch>({ summary: memory.summary, concepts: memory.concepts, examples: memory.examples, vocabulary: memory.vocabulary, jokes: memory.jokes });
  const save = useSeriesAction(seriesId, () => seriesApi.saveEpisodeMemory(seriesId, memory.episodeId, draft), 'Đã lưu bộ nhớ tập');
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bộ nhớ tập {memory.number ?? '?'}: {memory.title}
          </DialogTitle>
          <DialogDescription>Sửa nếu AI tóm tắt sai. Chỉ ảnh hưởng các tập viết sau; tập đã xong giữ nguyên.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mem-summary">Tóm tắt</Label>
            <Textarea id="mem-summary" rows={3} maxLength={1000} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          </div>
          {LISTS.map((l) => (
            <div key={l.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`mem-${l.key}`}>{l.label}</Label>
              <ListInput id={`mem-${l.key}`} value={draft[l.key]} onChange={(v) => setDraft({ ...draft, [l.key]: v })} placeholder="Gõ rồi Enter" />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(undefined, { onSuccess: onClose })}
          >
            {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What the series remembers: a season summary plus one entry per approved episode. Hand edits only touch future episodes. */
export function MemoryPanel({ seriesId }: { seriesId: string }) {
  const { data, isLoading } = useSeriesMemory(seriesId);
  const [editing, setEditing] = useState<EpisodeMemory | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const saveSeason = useSeriesAction(seriesId, (summary: string) => seriesApi.saveSeason(seriesId, summary), 'Đã lưu tóm tắt mùa');
  if (isLoading || !data) return <Skeleton className="h-64 rounded-2xl" />;
  const seasonText = season ?? data.season ?? '';
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section aria-labelledby="season-h" className="flex h-fit flex-col gap-3 rounded-2xl border bg-card p-5">
        <h2 id="season-h" className="text-h3 font-bold">
          Tóm tắt mùa
        </h2>
        <p className="text-small text-muted-foreground">Cứ mỗi 10 tập được duyệt, AI gộp bộ nhớ thành một bản tóm tắt để ngữ cảnh không phình ra. AI tập mới đọc bản này cộng 5 tập gần nhất.</p>
        <Label htmlFor="season" className="sr-only">
          Tóm tắt mùa
        </Label>
        <Textarea id="season" rows={7} maxLength={3000} value={seasonText} onChange={(e) => setSeason(e.target.value)} placeholder="Chưa có. Sẽ tự có sau tập duyệt thứ 10, hoặc bạn tự viết ở đây." />
        <Button className="w-fit" variant="outline" disabled={season === null || saveSeason.isPending} onClick={() => saveSeason.mutate(seasonText, { onSuccess: () => setSeason(null) })}>
          {saveSeason.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Lưu tóm tắt mùa
        </Button>
      </section>
      <section aria-labelledby="eps-mem-h" className="flex flex-col gap-3">
        <h2 id="eps-mem-h" className="text-h3 font-bold">
          Từng tập đã duyệt
        </h2>
        {data.episodes.length ? (
          [...data.episodes].reverse().map((m) => (
            <article key={m.episodeId} className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">
                    Tập {m.number ?? '?'} · {m.title}
                  </div>
                  <p className="mt-0.5 text-small text-muted-foreground">{m.summary}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Sửa bộ nhớ tập ${m.number ?? ''}`} onClick={() => setEditing(m)}>
                  <Pencil aria-hidden />
                </Button>
              </div>
              {LISTS.map((l) => (m[l.key].length ? <Chips key={l.key} items={m[l.key]} /> : null))}
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-small text-muted-foreground">Chưa có tập nào được duyệt. Sau khi bạn duyệt video, AI sẽ tóm tắt tập đó vào đây để tập sau nối tiếp mà không lặp lại.</p>
        )}
      </section>
      {editing ? <EditMemoryDialog seriesId={seriesId} memory={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
