'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentChannel } from '@/features/app';
import { useTools } from '@/features/episode/hooks/use-episode';
import { brandOf } from '@/features/episode/lib/preview';
import { cn } from '@/lib/utils';

import { TemplateCard } from '../components/TemplateCard';
import { filterTemplates, GROUPS, templateCatalog, type TemplateGroup } from '../lib/catalog';

export function TemplatesView() {
  const { data: tools, isLoading } = useTools();
  const { current } = useCurrentChannel();
  const brand = useMemo(() => brandOf(current), [current]);
  const [group, setGroup] = useState<TemplateGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const all = useMemo(() => templateCatalog((tools ?? []).flatMap((t) => t.blocks)), [tools]);
  const shown = useMemo(() => filterTemplates(all, group, query), [all, group, query]);
  const chip = (active: boolean) => cn('min-h-9 shrink-0 rounded-full border px-3.5 text-small font-semibold', active ? 'border-primary bg-accent text-accent-foreground' : 'bg-card text-slate-700 hover:border-slate-400');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Thư viện mẫu" description="Mọi kiểu chữ, cách mở cảnh, camera, hiệu ứng và loại cảnh của studio, chạy thật bằng màu và font của kênh. Chép tên rồi dán cho trợ lý (“đổi cảnh 3 sang …”) hoặc chọn trong phần Nâng cao của từng cảnh." />
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Tìm mẫu" placeholder="Tìm: gõ chữ, zoom, loé sáng…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Nhóm mẫu">
          <button type="button" aria-pressed={group === 'all'} className={chip(group === 'all')} onClick={() => setGroup('all')}>
            Tất cả ({all.length})
          </button>
          {GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={group === g.id} className={chip(group === g.id)} onClick={() => setGroup(g.id)}>
              {g.label} ({all.filter((t) => t.group === g.id).length})
            </button>
          ))}
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-2xl" /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => (
          <TemplateCard key={t.key} entry={t} brand={brand} />
        ))}
      </div>
      {!isLoading && !shown.length ? <p className="text-small text-muted-foreground">Không có mẫu nào khớp “{query}”.</p> : null}
    </div>
  );
}
