import { cn } from '@/lib/utils';

import { fmtUsd } from '../lib/format';
import type { UsageSummary } from '../services/usage.api';

const COLORS = { llm: 'bg-primary', image: 'bg-warning', tts: 'bg-success' } as const;
const LABELS = { llm: 'Văn bản', image: 'Ảnh', tts: 'Giọng' } as const;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Every day of the range (empty days included), stacked by what the money was spent on. */
export function DailyChart({ s }: { s: UsageSummary }) {
  const byDay = new Map(s.daily.map((d) => [d.day, d]));
  let days: string[];
  if (s.range === 'all') days = s.daily.map((d) => d.day);
  else {
    days = [];
    for (let d = new Date(s.from); d <= new Date(); d.setDate(d.getDate() + 1)) days.push(ymd(d));
  }
  const rows = days.map((day) => byDay.get(day) ?? { day, llm: 0, image: 0, tts: 0 });
  const max = Math.max(0.0001, ...rows.map((r) => r.llm + r.image + r.tts));
  if (!rows.some((r) => r.llm + r.image + r.tts > 0)) return <p className="py-8 text-center text-small text-muted-foreground">Chưa có lượt gọi nào trong khoảng này.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', COLORS[k])} aria-hidden />
            {LABELS[k]}
          </span>
        ))}
        <span className="ml-auto">Cao nhất: {fmtUsd(max === 0.0001 ? 0 : max)}</span>
      </div>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={`Chi phí theo ngày, tổng ${fmtUsd(rows.reduce((n, r) => n + r.llm + r.image + r.tts, 0))}`}>
        {rows.map((r) => {
          const total = r.llm + r.image + r.tts;
          return (
            <div key={r.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${r.day}: ${fmtUsd(total)} (văn bản ${fmtUsd(r.llm)}, ảnh ${fmtUsd(r.image)}, giọng ${fmtUsd(r.tts)})`}>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]" style={{ height: `${(total / max) * 100}%`, minHeight: total > 0 ? 2 : 0 }}>
                {(['llm', 'image', 'tts'] as const).map((k) => (r[k] > 0 ? <div key={k} className={COLORS[k]} style={{ height: `${(r[k] / total) * 100}%` }} /> : null))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-caption text-muted-foreground">
        <span>{rows[0]!.day.slice(5)}</span>
        <span>{rows.at(-1)!.day.slice(5)}</span>
      </div>
    </div>
  );
}
