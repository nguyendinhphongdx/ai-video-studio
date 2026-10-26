'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppConfig } from '@/features/app';

import { isBusy, useEpisodeAction } from '../hooks/use-episode';
import { episodeApi, type EpisodeView } from '../services/episode.api';

import { SkillSwitcher } from './SkillSwitcher';
import { ManualScriptPanel } from './storyboard/ManualScriptPanel';
import { Storyboard } from './storyboard/Storyboard';

function Writing() {
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex items-center gap-3 rounded-xl bg-info-soft px-4 py-3.5 text-small text-info">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>
          <b>AI đang viết kịch bản…</b> Thường mất 15–60 giây. Bạn có thể rời trang, kịch bản sẽ chờ ở đây.
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Step 1: get a script (AI or pasted), then review it on the storyboard. */
export function ScriptStage({ view }: { view: EpisodeView }) {
  const { data: config } = useAppConfig();
  const write = useEpisodeAction(view.episode.id, () => episodeApi.writeScript(view.episode.id));
  const switcher = <SkillSwitcher view={view} />;
  if (view.episode.scenes.length)
    return (
      <div className="flex flex-col gap-4">
        {switcher}
        <Storyboard view={view} />
      </div>
    );
  if (isBusy(view))
    return (
      <div className="flex flex-col gap-4">
        {switcher}
        <Writing />
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {switcher}
      {config?.llm.ready ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-bold">Chưa có kịch bản</h2>
            <p className="text-small text-muted-foreground">
              AI ({config.llm.providerLabel} · {config.llm.model}) sẽ viết theo skill và giọng văn của kênh.
            </p>
          </div>
          <Button size="lg" onClick={() => write.mutate(undefined)} disabled={write.isPending}>
            {write.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            Viết kịch bản bằng AI
          </Button>
        </div>
      ) : null}
      <ManualScriptPanel id={view.episode.id} />
    </div>
  );
}
