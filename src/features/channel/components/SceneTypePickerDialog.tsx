'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { withTools } from '@/core/skills/skill';
import { useTools } from '@/features/episode/hooks/use-episode';
import { skillApi, type SkillSummary } from '@/features/skill/services/skill.api';
import { LazyScenePlayer } from '@/features/templates/components/LazyScenePlayer';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { SceneBrand } from '@video/primitives';

import { matches, recommendBlocks } from '../lib/recommend';
import { blocksOf } from '../lib/toolkit';

/** Scenes every video needs; always allowed. */
const REQUIRED = new Set(['remotion/outro']);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  skills: SkillSummary[];
  defaultSkillId: string | null;
  brand: SceneBrand;
  context: string;
}

/** Choose which scene types the AI may use for a skill of this channel, each shown live on the channel's brand. */
export function SceneTypePickerDialog({ open, onOpenChange, channelId, skills, defaultSkillId, brand, context }: Props) {
  const qc = useQueryClient();
  const { data: tools } = useTools();
  const [skillId, setSkillId] = useState<string>(defaultSkillId ?? skills[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [allowed, setAllowed] = useState<string[]>([]);
  const skill = skills.find((s) => s.id === skillId) ?? null;
  useEffect(() => {
    if (open && !skills.some((s) => s.id === skillId)) setSkillId(defaultSkillId ?? skills[0]?.id ?? '');
  }, [open, skills, skillId, defaultSkillId]);
  useEffect(() => {
    if (skill && tools) setAllowed(blocksOf(skill.tools, tools).map((b) => b.ref));
  }, [skill, tools, open]);
  const all = useMemo(() => (tools ?? []).flatMap((t) => t.blocks), [tools]);
  const ranked = useMemo(() => recommendBlocks(all.filter((b) => matches(query, b.name, b.summary, b.ref)), context), [all, query, context]);
  const save = useMutation({
    mutationFn: async () => {
      const detail = await skillApi.get(channelId, skillId);
      const refs = all.filter((b) => allowed.includes(b.ref) || REQUIRED.has(b.ref)).map((b) => b.ref);
      return skillApi.save(channelId, skillId, withTools(skillId, detail.markdown, refs));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] });
      void qc.invalidateQueries({ queryKey: ['skill'] });
      toast.success('Đã lưu. Video viết sau đây dùng các loại cảnh này.');
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = (ref: string) => setAllowed((a) => (a.includes(ref) ? a.filter((x) => x !== ref) : [...a, ref]));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none gap-3 overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Chọn loại cảnh AI được dùng</DialogTitle>
          <DialogDescription>Tick càng nhiều loại, video càng đa dạng: AI tự chọn và đổi luân phiên. Mỗi ô chạy thật bằng màu và font của kênh.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Tìm loại cảnh" placeholder="Tìm: biểu đồ, phần mềm, chữ…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
          </div>
          <Select value={skillId} onValueChange={setSkillId}>
            <SelectTrigger aria-label="Áp cho kiểu video" className="h-11 w-64">
              <SelectValue placeholder="Kiểu video" />
            </SelectTrigger>
            <SelectContent>
              {skills.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Áp cho: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map(({ item, score, because }) => {
            const required = REQUIRED.has(item.ref);
            const on = required || allowed.includes(item.ref);
            return (
              <label key={item.ref} className={cn('flex cursor-pointer flex-col gap-2 rounded-xl border p-3', on ? 'border-primary bg-accent/30' : 'bg-card')}>
                <LazyScenePlayer block={item.ref} props={item.defaults} brand={brand} needsImage={'imagePrompt' in item.defaults} />
                <span className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 size-4 accent-primary" checked={on} disabled={required} onChange={() => toggle(item.ref)} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{item.name}</span>
                      {score > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-caption font-semibold text-accent-foreground" title={`Khớp với kênh: ${because.join(', ')}`}>
                          <Sparkles className="size-3" aria-hidden />
                          Hợp với kênh
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-small text-slate-700">{item.summary}</span>
                    {required ? <span className="text-caption text-muted-foreground">Luôn bật (kết video)</span> : null}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={!skill || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Lưu {allowed.length} loại cảnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
