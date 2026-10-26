'use client';

import { Layers, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useEpisodeAction, useSkills } from '../hooks/use-episode';
import { episodeApi, type EpisodeView } from '../services/episode.api';

/** Which kind of video this is. Changing it rewrites the script, so it asks first. Series videos follow their series. */
export function SkillSwitcher({ view }: { view: EpisodeView }) {
  const e = view.episode;
  const { data: skills } = useSkills(view.episode.channelId);
  const [next, setNext] = useState<string | null>(null);
  const change = useEpisodeAction(e.id, (skillId: string) => episodeApi.changeSkill(e.id, skillId), 'Đã đổi kiểu video');
  const usable = (skills ?? []).filter((s) => !s.issues.some((i) => i.level === 'error'));
  const current = usable.find((s) => s.id === e.skillId);
  const target = usable.find((s) => s.id === next);
  const editable = !e.seriesId && (e.status === 'planned' || e.status === 'draft' || e.status === 'script_review') && !view.job;
  if (e.seriesId) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-small">
      <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Label htmlFor="ep-skill" className="font-semibold">
        Kiểu video
      </Label>
      <Select value={e.skillId} onValueChange={(v) => v !== e.skillId && setNext(v)} disabled={!editable}>
        <SelectTrigger id="ep-skill" className="h-10 w-64">
          <SelectValue placeholder={current?.name ?? e.skillId} />
        </SelectTrigger>
        <SelectContent>
          {usable.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="min-w-0 flex-1 text-caption text-muted-foreground">{editable ? 'Kịch bản viết theo kiểu này. Đổi kiểu thì AI viết lại cả kịch bản.' : 'Chỉ đổi được trước khi duyệt kịch bản.'}</span>
      {target ? (
        <Dialog open onOpenChange={(open) => !open && setNext(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đổi sang “{target.name}”?</DialogTitle>
              <DialogDescription>Các cảnh hiện tại được viết cho kiểu “{current?.name ?? e.skillId}” nên sẽ bị xoá, AI viết lại toàn bộ kịch bản theo kiểu mới. Chủ đề video giữ nguyên.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNext(null)}>
                Giữ kiểu cũ
              </Button>
              <Button disabled={change.isPending} onClick={() => change.mutate(target.id, { onSettled: () => setNext(null) })}>
                {change.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Đổi và viết lại
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
