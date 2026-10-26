'use client';

import { useFollowChannel } from '@/features/app';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/animate-ui/components/radix/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { lintFormat } from '@/core/series/format';
import { useTools } from '@/features/episode';

import { BibleEditor } from '../components/BibleEditor';
import { FormatEditor } from '../components/FormatEditor';
import { MemoryPanel } from '../components/MemoryPanel';
import { OverviewTab } from '../components/OverviewTab';
import { PublishEditor } from '../components/PublishEditor';
import { RoadmapBoard } from '../components/RoadmapBoard';
import { RulesBar } from '../components/RulesBar';
import { useSeries, useSeriesAction } from '../hooks/use-series';
import { rulesOf, sameRules, type Rules } from '../lib/rules';
import { seriesApi, type SeriesView } from '../services/series.api';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'episodes', label: 'Các tập' },
  { id: 'format', label: 'Format' },
  { id: 'bible', label: 'Bible' },
  { id: 'memory', label: 'Bộ nhớ' },
  { id: 'publish', label: 'Đăng bài' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const RULE_TABS: TabId[] = ['format', 'bible', 'publish'];

function RenameDialog({ series, onClose }: { series: SeriesView; onClose: () => void }) {
  const [name, setName] = useState(series.name);
  const rename = useSeriesAction(series.id, (n: string) => seriesApi.update(series.id, { name: n }), 'Đã đổi tên series');
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên series</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) rename.mutate(name.trim(), { onSuccess: onClose });
          }}
        >
          <Label htmlFor="series-name">Tên series</Label>
          <Input id="series-name" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={!name.trim() || rename.isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SeriesDetailView({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: series, error } = useSeries(id);
  useFollowChannel(series?.channelId);
  const { data: tools } = useTools();
  const [draft, setDraft] = useState<Rules | null>(null);
  const [renaming, setRenaming] = useState(false);
  const save = useSeriesAction(id, (rules: Rules) => seriesApi.saveRules(id, rules));

  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!series) return <Skeleton className="h-96 rounded-2xl" />;

  const requested = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'overview';
  const go = (next: string) => router.replace(`${pathname}?tab=${next}`, { scroll: false });
  const base = rulesOf(series);
  const rules = draft ?? base;
  const dirty = draft !== null && !sameRules(draft, base);
  const formatErrors = lintFormat(rules.format);
  const edit = (patch: Partial<Rules>) => setDraft({ ...rules, ...patch });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href={ROUTES.series} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Tất cả series
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 font-extrabold">{series.name}</h1>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-bold text-accent-foreground">format v{series.currentVersion}</span>
          {series.status === 'archived' ? <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">Đã lưu trữ</span> : null}
          <Button variant="ghost" size="icon" aria-label="Đổi tên series" onClick={() => setRenaming(true)}>
            <Pencil aria-hidden />
          </Button>
        </div>
        <Tabs value={tab} onValueChange={go}>
          <TabsList className="w-fit max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
                {RULE_TABS.includes(t.id) && dirty ? <span className="ml-1.5 size-1.5 rounded-full bg-warning" aria-label="có thay đổi chưa lưu" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {tab === 'overview' ? <OverviewTab series={series} onGo={go} /> : null}
      {tab === 'episodes' ? <RoadmapBoard series={series} /> : null}
      {tab === 'format' ? <FormatEditor value={rules.format} onChange={(format) => edit({ format })} tools={tools} /> : null}
      {tab === 'bible' ? (
        <div className="max-w-3xl">
          <BibleEditor value={rules.bible} onChange={(bible) => edit({ bible })} />
        </div>
      ) : null}
      {tab === 'memory' ? <MemoryPanel seriesId={id} /> : null}
      {tab === 'publish' ? (
        <div className="max-w-3xl">
          <PublishEditor value={rules.publish} onChange={(publish) => edit({ publish })} />
        </div>
      ) : null}

      {dirty && draft ? (
        <RulesBar
          nextVersion={series.currentVersion + 1}
          blocked={formatErrors.length ? `Sửa lỗi ở tab Format trước khi lưu: ${formatErrors[0]}` : null}
          saving={save.isPending}
          onSave={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          onDiscard={() => setDraft(null)}
        />
      ) : null}
      {renaming ? <RenameDialog series={series} onClose={() => setRenaming(false)} /> : null}
    </div>
  );
}
