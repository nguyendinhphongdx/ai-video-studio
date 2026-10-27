'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { BudgetsCard } from '../components/BudgetsCard';
import { Breakdowns } from '../components/Breakdowns';
import { DailyChart } from '../components/DailyChart';
import { EventsList } from '../components/EventsList';
import { PricesCard } from '../components/PricesCard';
import { SummaryCards } from '../components/SummaryCards';
import { useUsageSummary } from '../hooks/use-usage';
import { RANGE_LABEL } from '../lib/format';
import type { UsageRange } from '../services/usage.api';

export function UsageView() {
  const [range, setRange] = useState<UsageRange>('30d');
  const { data: s, error } = useUsageSummary(range);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Chi phí" description="Mỗi lần gọi AI (viết kịch bản, trợ lý, ảnh, giọng Google) được ghi lại cùng token và chi phí, để bạn biết tiền đi đâu và đặt trần chi tiêu." />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Khoảng thời gian">
        {(Object.keys(RANGE_LABEL) as UsageRange[]).map((r) => (
          <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn('min-h-10 rounded-full border px-4 text-small font-semibold transition', range === r ? 'border-primary bg-accent text-accent-foreground' : 'bg-card text-slate-700 hover:border-slate-400')}>
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {!s ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <SummaryCards s={s} />
          {s.totals.unpriced ? (
            <p className="rounded-xl bg-warning-soft px-4 py-3 text-small text-warning">
              {s.totals.unpriced} lượt gọi chưa có giá nên chưa được tính tiền. Thêm giá cho model đó ở mục Bảng giá bên dưới (token vẫn được ghi).
            </p>
          ) : null}
          {s.totals.estimated ? <p className="text-caption text-muted-foreground">{s.totals.estimated} lượt không được nhà cung cấp báo token nên là số ước tính (đánh dấu trong lịch sử).</p> : null}
          <section aria-labelledby="daily-h" className="rounded-2xl border bg-card p-5">
            <h3 id="daily-h" className="mb-3 text-body font-bold">
              Chi phí theo ngày
            </h3>
            <DailyChart s={s} />
          </section>
          <BudgetsCard s={s} />
          <Breakdowns s={s} />
          <EventsList range={range} />
          <PricesCard fxUsdVnd={s.fxUsdVnd} />
        </>
      )}
    </div>
  );
}
