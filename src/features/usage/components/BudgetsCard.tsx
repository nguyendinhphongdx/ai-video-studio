'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentChannel } from '@/features/app';
import { cn } from '@/lib/utils';

import { useUsageActions } from '../hooks/use-usage';
import { fmtUsd, fmtVnd } from '../lib/format';
import type { BudgetInput, UsageSummary } from '../services/usage.api';

const STATE_STYLE = { ok: 'bg-primary', alert: 'bg-warning', over: 'bg-destructive' } as const;
const STATE_TEXT = { ok: '', alert: 'Sắp hết', over: 'Đã vượt' } as const;

function BudgetForm({ fx }: { fx: number }) {
  const { channels } = useCurrentChannel();
  const { saveBudget } = useUsageActions();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<BudgetInput>({ scope: 'global', channelId: null, period: 'month', limitUsd: 10, mode: 'warn', alertPct: 80 });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus aria-hidden />
          Thêm ngân sách
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm ngân sách</DialogTitle>
          <DialogDescription>Đặt trần chi tiêu AI theo ngày hoặc tháng, cho cả hệ thống hoặc riêng một kênh.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-scope">Áp dụng cho</Label>
            <Select value={f.scope} onValueChange={(v) => setF({ ...f, scope: v as BudgetInput['scope'], channelId: v === 'global' ? null : (channels[0]?.id ?? null) })}>
              <SelectTrigger id="b-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Toàn bộ hệ thống</SelectItem>
                <SelectItem value="channel">Một kênh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.scope === 'channel' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-channel">Kênh</Label>
              <Select value={f.channelId ?? ''} onValueChange={(v) => setF({ ...f, channelId: v })}>
                <SelectTrigger id="b-channel" className="w-full">
                  <SelectValue placeholder="Chọn kênh" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-period">Chu kỳ</Label>
            <Select value={f.period} onValueChange={(v) => setF({ ...f, period: v as BudgetInput['period'] })}>
              <SelectTrigger id="b-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Mỗi ngày</SelectItem>
                <SelectItem value="month">Mỗi tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-limit">Hạn mức (USD) · ≈ {fmtVnd(f.limitUsd || 0, fx)}</Label>
            <Input id="b-limit" type="number" min={0.01} step={0.5} value={f.limitUsd} onChange={(e) => setF({ ...f, limitUsd: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-mode">Khi vượt hạn mức</Label>
            <Select value={f.mode} onValueChange={(v) => setF({ ...f, mode: v as BudgetInput['mode'] })}>
              <SelectTrigger id="b-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warn">Chỉ cảnh báo</SelectItem>
                <SelectItem value="block">Chặn việc tốn tiền mới</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-alert">Cảnh báo từ (%)</Label>
            <Input id="b-alert" type="number" min={1} max={100} value={f.alertPct} onChange={(e) => setF({ ...f, alertPct: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Huỷ</Button>
          </DialogClose>
          <Button
            disabled={saveBudget.isPending || !(f.limitUsd > 0) || (f.scope === 'channel' && !f.channelId)}
            onClick={() => saveBudget.mutate(f, { onSuccess: () => setOpen(false) })}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Spending limits and how much of each is used. A "block" budget stops new paid calls once it is used up. */
export function BudgetsCard({ s }: { s: UsageSummary }) {
  const { removeBudget } = useUsageActions();
  return (
    <section aria-labelledby="budgets-h" className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="budgets-h" className="text-body font-bold">
            Ngân sách
          </h3>
          <p className="text-caption text-muted-foreground">Vượt hạn mức: cảnh báo hoặc chặn việc tốn tiền mới (ảnh, giọng Google, gọi AI).</p>
        </div>
        <BudgetForm fx={s.fxUsdVnd} />
      </div>
      {s.budgets.length ? (
        <ul className="flex flex-col gap-4">
          {s.budgets.map((b) => (
            <li key={b.id} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-small">
                <span className="font-semibold">
                  {b.scope === 'global' ? 'Toàn hệ thống' : (b.channelName ?? 'Kênh đã xoá')} · {b.period === 'day' ? 'mỗi ngày' : 'mỗi tháng'}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-caption font-medium">{b.mode === 'block' ? 'chặn khi vượt' : 'chỉ cảnh báo'}</span>
                </span>
                <span className={cn('tabular-nums', b.state !== 'ok' && 'font-semibold', b.state === 'over' && 'text-destructive', b.state === 'alert' && 'text-warning')}>
                  {fmtUsd(b.spentUsd)} / {fmtUsd(b.limitUsd)} · {b.pct}% {STATE_TEXT[b.state] ? `· ${STATE_TEXT[b.state]}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(b.pct, 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-full', STATE_STYLE[b.state])} style={{ width: `${Math.min(100, b.pct)}%` }} />
                </div>
                <Button variant="ghost" size="icon" aria-label="Xoá ngân sách" disabled={removeBudget.isPending} onClick={() => removeBudget.mutate(b.id)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-muted-foreground">Chưa có ngân sách nào. Thêm một hạn mức hàng tháng để tránh bất ngờ khi hoá đơn về.</p>
      )}
    </section>
  );
}
