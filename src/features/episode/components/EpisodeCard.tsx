'use client';

import { ArrowRight, Clapperboard } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import type { ChannelView } from '@/features/app';

import { ago, fmtDuration, statusOf } from '../lib/status';
import { blockIndex, brandOf, sceneSeconds } from '../lib/preview';
import type { EpisodeView, ToolInfo } from '../services/episode.api';

import { SceneThumbnail } from './preview';
import { StatusBadge } from './StatusBadge';

function Thumb({ view, tools, channel }: { view: EpisodeView; tools: ToolInfo[] | undefined; channel: ChannelView | null }) {
  const render = view.renders.find((r) => r.thumbnailUrl);
  if (render?.thumbnailUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={render.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />;
  }
  const blocks = blockIndex(tools);
  const scene = view.episode.scenes.find((s) => !s.locked && blocks.get(s.block)?.previewable) ?? view.episode.scenes.find((s) => blocks.get(s.block)?.previewable);
  if (scene && tools) {
    return <SceneThumbnail block={scene.block} props={scene.props} ordinal={1} brand={brandOf(channel)} durationSec={sceneSeconds(scene, blocks)} />;
  }
  return (
    <div className="grid aspect-video w-full place-items-center bg-muted text-muted-foreground">
      <Clapperboard className="size-7" aria-hidden />
    </div>
  );
}

export function EpisodeCard({ view, tools, channel }: { view: EpisodeView; tools: ToolInfo[] | undefined; channel: ChannelView | null }) {
  const e = view.episode;
  const status = statusOf(view);
  const duration = view.renders[0]?.durationSec;
  return (
    <Link href={ROUTES.episode(e.id)} className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative">
        <Thumb view={view} tools={tools} channel={channel} />
        <StatusBadge status={status} className="absolute left-2.5 top-2.5 shadow-card" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="line-clamp-2 text-body font-bold leading-snug">{e.title || e.topic}</div>
        <div className="flex flex-wrap gap-x-1.5 text-caption text-muted-foreground">
          {e.number !== null ? <span>Tập {e.number} ·</span> : null}
          <span>{ago(e.createdAt)}</span>
          {duration ? <span>· {fmtDuration(duration)}</span> : null}
          <span>· {e.formats.map((f) => (f === 'portrait' ? '9:16' : '16:9')).join(' + ')}</span>
        </div>
        <div className="mt-auto flex items-center gap-1 pt-2 text-small font-semibold text-primary">
          {status.next}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export function EpisodeGrid({ views, tools, channel, empty }: { views: EpisodeView[]; tools: ToolInfo[] | undefined; channel: ChannelView | null; empty: string }) {
  if (!views.length) return <p className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center text-small text-muted-foreground">{empty}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {views.map((v) => (
        <EpisodeCard key={v.episode.id} view={v} tools={tools} channel={channel} />
      ))}
    </div>
  );
}
