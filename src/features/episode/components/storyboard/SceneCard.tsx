'use client';

import { Loader2, Lock, Pencil, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Scene } from '@/core/domain/episode';
import type { QualityIssue } from '@/core/quality/check';
import { cn } from '@/lib/utils';
import type { SceneBrand } from '@video/primitives';

import { fmtDuration } from '../../lib/status';
import { sceneSeconds, type blockIndex } from '../../lib/preview';
import { SceneThumbnail } from '../preview';

interface Props {
  scene: Scene;
  ordinal: number;
  blocks: ReturnType<typeof blockIndex>;
  brand: SceneBrand;
  issues: QualityIssue[];
  voice: { play: (s: Scene) => void; playing: string | null; loading: string | null };
  onOpen: () => void;
  onJump: () => void;
}

export function SceneCard({ scene, ordinal, blocks, brand, issues, voice, onOpen, onJump }: Props) {
  const block = blocks.get(scene.block);
  const seconds = sceneSeconds(scene, blocks);
  return (
    <article className={cn('flex flex-col gap-2.5 rounded-xl border bg-card p-2.5', issues.some((i) => i.level === 'error') && 'border-destructive')}>
      <button type="button" onClick={onJump} className="relative overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring" aria-label="Xem cảnh này trong bản xem trước">
        {block?.previewable !== false ? (
          <SceneThumbnail block={scene.block} props={scene.props} ordinal={ordinal} brand={brand} durationSec={seconds} />
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg bg-muted text-caption text-muted-foreground">@{scene.block}</div>
        )}
        {scene.locked ? (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">
            <Lock className="size-3" aria-hidden />
            Khoá
          </span>
        ) : null}
      </button>
      <div className="flex items-center gap-1.5 px-0.5 text-caption">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground">{block?.name ?? scene.block}</span>
        <span className="text-muted-foreground">~{fmtDuration(seconds)}</span>
        <Button variant="ghost" size="sm" className="ml-auto h-8 px-2" onClick={onOpen}>
          <Pencil aria-hidden />
          {scene.locked ? 'Xem' : 'Sửa'}
        </Button>
      </div>
      <div className="flex items-start gap-2 px-0.5">
        <Button
          variant="secondary"
          size="icon"
          className="size-8 shrink-0 rounded-full bg-accent text-accent-foreground"
          onClick={() => voice.play(scene)}
          disabled={!scene.narration.trim()}
          aria-label={voice.playing === scene.id ? 'Dừng' : 'Nghe thử lời đọc'}
        >
          {voice.loading === scene.id ? <Loader2 className="animate-spin" aria-hidden /> : voice.playing === scene.id ? <Square aria-hidden /> : <Play aria-hidden />}
        </Button>
        <p className="text-small leading-snug text-slate-700">{scene.narration || <span className="italic text-muted-foreground">Chưa có lời đọc</span>}</p>
      </div>
      {issues.map((i, k) => (
        <p key={k} className={cn('px-0.5 text-caption font-medium', i.level === 'error' ? 'text-destructive' : 'text-warning')}>
          {i.message}
        </p>
      ))}
    </article>
  );
}
