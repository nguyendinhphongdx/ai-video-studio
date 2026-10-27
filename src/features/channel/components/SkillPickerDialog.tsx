'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTools } from '@/features/episode/hooks/use-episode';
import { skillApi, skillKeys } from '@/features/skill/services/skill.api';
import { LazyScenePlayer } from '@/features/templates/components/LazyScenePlayer';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { SceneBrand } from '@video/primitives';

import { blocksOf } from '../lib/toolkit';
import { matches, recommendSkills } from '../lib/recommend';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  brand: SceneBrand;
  /** What the channel says about itself: the likely fits are put first. */
  context: string;
}

/** Pick several video styles from the market at once: search, see what each one looks like on this channel's brand, install. */
export function SkillPickerDialog({ open, onOpenChange, channelId, brand, context }: Props) {
  const qc = useQueryClient();
  const { data: tools } = useTools();
  const market = useQuery({ queryKey: skillKeys.market(channelId), queryFn: () => skillApi.market(channelId), enabled: open });
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const ranked = useMemo(() => recommendSkills((market.data ?? []).filter((m) => matches(query, m.name, m.description, m.tags.join(' '))), context), [market.data, query, context]);
  const shown = ranked.find((r) => r.item.id === (focus ?? ranked[0]?.item.id))?.item ?? null;
  const previews = shown && tools ? blocksOf(shown.tools, tools).filter((b) => b.ref !== 'remotion/outro').slice(0, 4) : [];
  const install = useMutation({
    mutationFn: async () => {
      for (const id of picked) await skillApi.install(channelId, id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] });
      void qc.invalidateQueries({ queryKey: ['market'] });
      toast.success(`Đã thêm ${picked.length} kiểu video vào kênh. Giờ chúng là của kênh, sửa thoải mái.`);
      setPicked([]);
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none gap-3 overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Thêm kiểu video cho kênh</DialogTitle>
          <DialogDescription>Chọn một hoặc nhiều kiểu. Bên phải là các loại cảnh của kiểu đó chạy bằng màu và font của kênh bạn.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Tìm kiểu video" placeholder="Tìm: thiếu nhi, giải thích, điều tra…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto md:max-h-[55dvh]" aria-label="Kiểu video trong kho">
            {market.isLoading ? <li className="text-small text-muted-foreground">Đang tải kho…</li> : null}
            {ranked.map(({ item, score, because }) => {
              const installed = Boolean(item.installedAs);
              const on = picked.includes(item.id);
              return (
                <li key={item.id}>
                  <div className={cn('flex items-start gap-3 rounded-xl border p-3', shown?.id === item.id && 'border-primary bg-accent/40')}>
                    <input type="checkbox" aria-label={`Chọn ${item.name}`} className="mt-1 size-4 accent-primary" disabled={installed || item.issues.some((i) => i.level === 'error')} checked={on || installed} onChange={() => toggle(item.id)} />
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setFocus(item.id)}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{item.name}</span>
                        {installed ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-caption font-semibold text-success">Đã cài</span> : null}
                        {score > 0 && !installed ? (
                          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-caption font-semibold text-accent-foreground" title={`Khớp với kênh: ${because.join(', ')}`}>
                            <Sparkles className="size-3" aria-hidden />
                            Hợp với kênh
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-small text-slate-700">{item.description}</span>
                    </button>
                  </div>
                </li>
              );
            })}
            {market.data && !ranked.length ? <li className="text-small text-muted-foreground">Không có kiểu nào khớp “{query}”.</li> : null}
          </ul>
          <section aria-label="Xem trước" className="flex flex-col gap-3">
            {shown ? (
              <>
                <div>
                  <h3 className="text-title font-bold">{shown.name}</h3>
                  <p className="text-small text-slate-700">{shown.description}</p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {shown.scenes.min}–{shown.scenes.max} cảnh · {shown.tags.join(', ')}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {previews.map((b) => (
                    <figure key={b.ref} className="flex flex-col gap-1">
                      <LazyScenePlayer block={b.ref} props={b.defaults} brand={brand} needsImage={'imagePrompt' in b.defaults} />
                      <figcaption className="text-caption font-semibold">{b.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-small text-muted-foreground">Chọn một kiểu để xem trước.</p>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button disabled={!picked.length || install.isPending} onClick={() => install.mutate()}>
            {install.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Thêm {picked.length ? `${picked.length} kiểu` : ''} vào kênh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
