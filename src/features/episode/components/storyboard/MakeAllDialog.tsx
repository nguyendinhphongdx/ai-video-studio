'use client';

import { CircleAlert, ImageIcon, Volume2, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { budgetWarnings, type MakePlan } from '@/core/scenes/make-plan';
import { useEstimate, useUsageSummary } from '@/features/usage/hooks/use-usage';
import { fmtUsd, fmtVnd } from '@/features/usage/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MakePlan;
  channelId: string;
  voice: string;
  pending: boolean;
  onConfirm: (approveAfter: boolean) => void;
}

/** One confirmation for the whole video: what will be made, what it costs, whether a budget is in the way. */
export function MakeAllDialog({ open, onOpenChange, plan, channelId, voice, pending, onConfirm }: Props) {
  const [approveAfter, setApproveAfter] = useState(false);
  const estimate = useEstimate(plan.images, plan.voiceTexts, voice);
  const { data: summary } = useUsageSummary('month');
  const warnings = budgetWarnings(estimate?.usd ?? null, channelId, summary?.budgets ?? []);
  const blocked = warnings.some((w) => w.level === 'block' && /đã dùng hết/.test(w.text));
  const priceNote = !estimate ? 'Đang tính…' : estimate.usd === null ? 'Chưa có giá trong bảng giá nên chưa ước tính được tiền (mở trang Chi phí để thêm giá).' : estimate.usd === 0 ? 'Miễn phí (giọng Edge và không tạo ảnh AI).' : `${fmtUsd(estimate.usd)} ≈ ${fmtVnd(estimate.usd, estimate.fxUsdVnd)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Làm hết giúp tôi</DialogTitle>
          <DialogDescription>Studio tạo mọi ảnh và giọng còn thiếu trong một lượt, rồi bạn xem lại và duyệt một lần.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-small">
          <li className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
            {plan.images} ảnh AI
          </li>
          <li className="flex items-center gap-2">
            <Volume2 className="size-4 text-muted-foreground" aria-hidden />
            {plan.voices} đoạn giọng đọc{estimate?.voiceSeconds ? ` (~${estimate.voiceSeconds} giây)` : ''}
          </li>
        </ul>
        <p className="rounded-lg bg-muted px-3 py-2 text-small" aria-live="polite">
          <span className="font-semibold">Chi phí ước tính: </span>
          {priceNote}
        </p>
        {warnings.map((w) => (
          <p key={w.text} role="alert" className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-small', w.level === 'block' ? 'bg-danger-soft text-destructive' : 'bg-warning-soft text-warning')}>
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {w.text}
          </p>
        ))}
        <label className="flex items-center gap-2 text-small">
          <input type="checkbox" className="size-4 accent-primary" checked={approveAfter} onChange={(e) => setApproveAfter(e.target.checked)} />
          Duyệt luôn các cảnh khi đã đủ
        </label>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Huỷ</Button>
          </DialogClose>
          <Button disabled={pending || blocked} onClick={() => onConfirm(approveAfter)}>
            <Wand2 aria-hidden />
            Tạo hết
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
