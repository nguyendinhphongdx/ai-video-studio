'use client';

import { CircleCheck, ImageIcon, Loader2, Lock, Pencil, Play, Square, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Scene } from '@/core/domain/episode';
import type { QualityIssue } from '@/core/quality/check';
import { cn } from '@/lib/utils';
import type { SceneBrand } from '@video/primitives';

import { fmtDuration } from '../../lib/status';
import { sceneSeconds, type blockIndex } from '../../lib/preview';
import type { SceneAssetView } from '../../services/episode.api';
import { SceneThumbnail } from '../preview';

interface Props {
  scene: Scene;
  index: number;
  ordinal: number;
  blocks: ReturnType<typeof blockIndex>;
  brand: SceneBrand;
  issues: QualityIssue[];
  assets: SceneAssetView | undefined;
  /** The scene is being worked on by a background job. */
  working: boolean;
  editable: boolean;
  playingId: string | null;
  onPlay: () => void;
  onGenerate: (what: 'image' | 'voice') => void;
  onApprove: (approved: boolean) => void;
  onOpen: () => void;
  onJump: () => void;
}

function Chip({ ok, stale, label, icon }: { ok: boolean; stale?: boolean; label: string; icon: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold', ok ? 'bg-success-soft text-success' : stale ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground')}>
      {icon}
      {label}
      {stale ? ' (cũ)' : ''}
    </span>
  );
}

/** One scene on the board: its preview, its picture and voice status with the buttons to make them, and its approval. */
export function SceneCard({ scene, index, ordinal, blocks, brand, issues, assets, working, editable, playingId, onPlay, onGenerate, onApprove, onOpen, onJump }: Props) {
  const block = blocks.get(scene.block);
  const seconds = sceneSeconds(scene, blocks, assets?.voiceSeconds ? new Map([[scene.id, { url: '', seconds: assets.voiceSeconds }]]) : undefined);
  const needsImage = assets?.needsImage ?? false;
  const needsVoice = assets?.needsVoice ?? Boolean(scene.narration.trim());
  const imageOk = !needsImage || Boolean(assets?.imageUrl);
  const voiceOk = !needsVoice || Boolean(assets?.voiceUrl);
  const missing = [!imageOk && 'ảnh', !voiceOk && 'giọng'].filter(Boolean).join(' và ');
  return (
    <article className={cn('flex flex-col gap-2.5 rounded-xl border bg-card p-2.5', issues.some((i) => i.level === 'error') && 'border-destructive', scene.approved && 'border-success/60 ring-1 ring-success/30')}>
      <button type="button" onClick={onJump} className="relative overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring" aria-label="Xem cảnh này trong bản xem trước">
        {block?.previewable !== false ? (
          <SceneThumbnail block={scene.block} props={assets?.imageUrl ? { ...scene.props, image: assets.imageUrl } : scene.props} ordinal={ordinal} brand={brand} durationSec={seconds} />
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg bg-muted text-caption text-muted-foreground">@{scene.block}</div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">Cảnh {index + 1}</span>
        {scene.locked ? (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-caption font-semibold text-white">
            <Lock className="size-3" aria-hidden />
            Khoá
          </span>
        ) : null}
        {working ? (
          <span className="absolute inset-0 grid place-items-center bg-black/35 text-white" role="status" aria-label="Đang tạo">
            <Loader2 className="size-6 animate-spin" aria-hidden />
          </span>
        ) : null}
      </button>
      <div className="flex items-center gap-1.5 px-0.5 text-caption">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground">{block?.name ?? scene.block}</span>
        <span className="text-muted-foreground">~{fmtDuration(seconds)}</span>
        <Button variant="ghost" size="sm" className="ml-auto h-8 px-2" onClick={onOpen}>
          <Pencil aria-hidden />
          {scene.locked || !editable ? 'Xem' : 'Sửa'}
        </Button>
      </div>
      <div className="flex items-start gap-2 px-0.5">
        <Button variant="secondary" size="icon" className="size-8 shrink-0 rounded-full bg-accent text-accent-foreground" onClick={onPlay} disabled={!assets?.voiceUrl} aria-label={playingId === scene.id ? 'Dừng' : assets?.voiceUrl ? 'Nghe giọng đã tạo' : 'Chưa có giọng, tạo giọng để nghe'}>
          {playingId === scene.id ? <Square aria-hidden /> : <Play aria-hidden />}
        </Button>
        <p className="text-small leading-snug text-slate-700">{scene.narration || <span className="italic text-muted-foreground">Chưa có lời đọc</span>}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-0.5">
        {needsImage ? <Chip ok={imageOk} stale={assets?.imageStale} label="Ảnh" icon={<ImageIcon className="size-3" aria-hidden />} /> : null}
        {needsVoice ? <Chip ok={voiceOk} stale={assets?.voiceStale} label="Giọng" icon={<Volume2 className="size-3" aria-hidden />} /> : null}
        {scene.approved ? <Chip ok label="Đã duyệt" icon={<CircleCheck className="size-3" aria-hidden />} /> : null}
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {needsImage ? (
            <Button variant="outline" size="sm" className="h-8" disabled={working} onClick={() => onGenerate('image')}>
              <ImageIcon aria-hidden />
              {assets?.imageUrl ? 'Tạo lại ảnh' : 'Tạo ảnh'}
            </Button>
          ) : null}
          {needsVoice ? (
            <Button variant="outline" size="sm" className="h-8" disabled={working} onClick={() => onGenerate('voice')}>
              <Volume2 aria-hidden />
              {assets?.voiceUrl ? 'Tạo lại giọng' : 'Tạo giọng'}
            </Button>
          ) : null}
          {scene.approved ? (
            <Button variant="ghost" size="sm" className="ml-auto h-8" disabled={working} onClick={() => onApprove(false)}>
              Bỏ duyệt
            </Button>
          ) : (
            <Button size="sm" className="ml-auto h-8" disabled={working || !assets?.ready} onClick={() => onApprove(true)} title={assets?.ready ? undefined : `Cần có ${missing || 'đủ tài nguyên'} trước khi duyệt`}>
              <CircleCheck aria-hidden />
              Duyệt cảnh
            </Button>
          )}
        </div>
      ) : null}
      {issues.map((i, k) => (
        <p key={k} className={cn('px-0.5 text-caption font-medium', i.level === 'error' ? 'text-destructive' : 'text-warning')}>
          {i.message}
        </p>
      ))}
    </article>
  );
}
