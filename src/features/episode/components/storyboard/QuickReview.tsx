'use client';

import { CircleCheck, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Format } from '@/core/domain/catalog';
import type { StoryboardProps } from '@video/compositions';
import { cn } from '@/lib/utils';

import { StoryboardPlayer } from '../preview';

export interface ReviewScene {
  id: string;
  label: string;
  approved: boolean;
  ready: boolean;
  /** Why it cannot be approved yet. */
  problem: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  props: StoryboardProps;
  durationInFrames: number;
  format: Format;
  scenes: ReviewScene[];
  starts: number[];
  seek: { frame: number; nonce: number } | null;
  onSeek: (index: number) => void;
  onApproveAll: () => void;
  onBack: (sceneId: string | null) => void;
  pending: boolean;
}

/** Watch the whole video with its real pictures and voices, then approve everything that is ready in one click. */
export function QuickReview({ open, onOpenChange, props, durationInFrames, format, scenes, onSeek, onApproveAll, onBack, pending, seek }: Props) {
  const approvable = scenes.filter((s) => s.ready && !s.approved);
  const firstProblem = scenes.find((s) => !s.ready) ?? null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none gap-3 rounded-none p-4 sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Duyệt nhanh</DialogTitle>
          <DialogDescription>Xem cả video với ảnh và giọng thật. Ổn thì duyệt tất cả, chưa ổn thì quay lại sửa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className={cn('mx-auto w-full', format === 'portrait' && 'max-w-xs')}>
            <StoryboardPlayer props={props} durationInFrames={durationInFrames} format={format} seek={seek} />
          </div>
          <ol className="flex flex-col gap-1.5" aria-label="Các cảnh">
            {scenes.map((s, i) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSeek(i)} className={cn('flex min-h-11 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-small hover:bg-accent', !s.ready && 'border-warning/40 bg-warning-soft')}>
                  <span className="font-semibold tabular-nums">{i + 1}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.label}</span>
                    {s.problem ? <span className="block text-caption text-warning">{s.problem}</span> : null}
                  </span>
                  {s.approved ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Đã duyệt" /> : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onBack(firstProblem?.id ?? null)}>
            <Undo2 aria-hidden />
            Quay lại sửa{firstProblem ? ` cảnh ${scenes.indexOf(firstProblem) + 1}` : ''}
          </Button>
          <Button disabled={pending || !approvable.length} onClick={onApproveAll}>
            <CircleCheck aria-hidden />
            Duyệt tất cả{approvable.length ? ` (${approvable.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
