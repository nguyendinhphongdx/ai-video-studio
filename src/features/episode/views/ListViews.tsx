'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/animate-ui/components/radix/tabs';
import { useCurrentChannel } from '@/features/app';

import { EpisodeGrid } from '../components/EpisodeCard';
import { isBusy, useEpisodes, useTools } from '../hooks/use-episode';
import { needsReview } from '../lib/status';
import type { EpisodeView } from '../services/episode.api';

const FILTERS: { id: string; label: string; test: (v: EpisodeView) => boolean }[] = [
  { id: 'all', label: 'Tất cả', test: () => true },
  { id: 'review', label: 'Cần duyệt', test: needsReview },
  { id: 'busy', label: 'Đang làm', test: (v) => isBusy(v) || v.episode.status === 'producing' },
  { id: 'done', label: 'Sẵn sàng đăng', test: (v) => v.episode.status === 'published' },
];

export function LibraryView() {
  const { current } = useCurrentChannel();
  const { data: episodes, isLoading } = useEpisodes(current?.id);
  const { data: tools } = useTools();
  const [filter, setFilter] = useState('all');
  const all = episodes ?? [];
  const active = FILTERS.find((f) => f.id === filter)!;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Thư viện" description={`Mọi video của kênh ${current?.name ?? ''}.`} />
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.label}
              <span className="ml-1.5 text-muted-foreground">{all.filter(f.test).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? null : <EpisodeGrid views={all.filter(active.test)} tools={tools} channel={current} empty="Không có video nào ở mục này." />}
    </div>
  );
}

export function ReviewView() {
  const { current } = useCurrentChannel();
  const { data: episodes, isLoading } = useEpisodes(current?.id);
  const { data: tools } = useTools();
  const items = (episodes ?? []).filter(needsReview);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cần duyệt" description="Kịch bản và video đang chờ bạn, cùng các việc bị lỗi cần thử lại." />
      {isLoading ? null : <EpisodeGrid views={items} tools={tools} channel={current} empty="Không có gì cần duyệt. Tuyệt!" />}
    </div>
  );
}
