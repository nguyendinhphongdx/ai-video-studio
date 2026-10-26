import type { LucideIcon } from 'lucide-react';

import { PageHeader } from './PageHeader';

/** Placeholder for screens scheduled in a later stage of the plan. */
export function ComingSoon({ title, description, icon: Icon, stage }: { title: string; description: string; icon: LucideIcon; stage: string }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="font-semibold">Màn hình này làm ở {stage}</p>
        <p className="max-w-md text-small text-muted-foreground">Phần nền (API, dữ liệu, worker) đã có. Giao diện sẽ được dựng theo mockup trong kế hoạch.</p>
      </div>
    </div>
  );
}
