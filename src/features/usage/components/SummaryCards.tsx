import { Banknote, Image as ImageIcon, Mic, Type } from 'lucide-react';

import { fmtNum, fmtUsd, fmtVnd } from '../lib/format';
import type { UsageSummary } from '../services/usage.api';

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="truncate text-title font-extrabold tracking-tight">{value}</div>
      {sub ? <div className="truncate text-caption text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

/** The four numbers people look at first: money, text tokens, pictures, voice time. */
export function SummaryCards({ s }: { s: UsageSummary }) {
  const t = s.totals;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={<Banknote className="size-4" aria-hidden />} label="Tổng chi phí" value={fmtUsd(t.usd)} sub={`${fmtVnd(t.usd, s.fxUsdVnd)} · ${t.calls} lượt gọi`} />
      <Card icon={<Type className="size-4" aria-hidden />} label="Token văn bản" value={fmtNum(t.inputTokens + t.outputTokens + t.cachedTokens)} sub={`vào ${fmtNum(t.inputTokens + t.cachedTokens)} · ra ${fmtNum(t.outputTokens)}${t.cachedTokens ? ` · cache ${fmtNum(t.cachedTokens)}` : ''}`} />
      <Card icon={<ImageIcon className="size-4" aria-hidden />} label="Ảnh AI" value={`${Math.round(t.images)}`} sub="ảnh đã tạo" />
      <Card icon={<Mic className="size-4" aria-hidden />} label="Giọng đọc" value={`${Math.round(t.ttsSeconds / 60 * 10) / 10} phút`} sub="âm thanh đã tạo" />
    </div>
  );
}
