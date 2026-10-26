'use client';

import { CircleAlert, CircleCheck, Loader2, Plus, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { FPS, type Format } from '@/core/domain/catalog';
import type { Scene } from '@/core/domain/episode';
import { useAppConfig, useCurrentChannel } from '@/features/app';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { isBusy, useEpisodeAction, useTools } from '../../hooks/use-episode';
import { blockIndex, brandOf, storyboardProps } from '../../lib/preview';
import { fmtDuration } from '../../lib/status';
import { episodeApi, type EpisodeView } from '../../services/episode.api';
import { StoryboardPlayer } from '../preview';

import { ManualScriptPanel } from './ManualScriptPanel';
import { ReviseBar } from './ReviseBar';
import { SceneCard } from './SceneCard';
import { SceneEditor } from './SceneEditor';
import { useScriptDraft } from './use-script-draft';
import { useVoicePreview } from './use-voice-preview';

/** One "+" per slot; blocks the slot already uses most come first. */
function AddSceneButton({ refs, blocks, usage, onAdd }: { refs: string[]; blocks: ReturnType<typeof blockIndex>; usage: string[]; onAdd: (ref: string) => void }) {
  const sorted = [...refs].sort((a, b) => usage.filter((u) => u === b).length - usage.filter((u) => u === a).length);
  const box = 'grid min-h-40 w-full place-items-center rounded-xl border-2 border-dashed text-small font-semibold text-muted-foreground hover:border-primary hover:bg-accent hover:text-accent-foreground';
  const label = (
    <span className="flex items-center gap-1.5">
      <Plus className="size-4" aria-hidden />
      Thêm cảnh
    </span>
  );
  if (sorted.length === 1)
    return (
      <button type="button" className={box} onClick={() => onAdd(sorted[0]!)}>
        {label}
      </button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={box}>
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Chọn khối dựng</DropdownMenuLabel>
        {sorted.map((ref) => (
          <DropdownMenuItem key={ref} onSelect={() => onAdd(ref)} className="flex-col items-start gap-0.5">
            <span className="font-semibold">{blocks.get(ref)?.name ?? ref}</span>
            <span className="text-caption text-muted-foreground">{blocks.get(ref)?.summary}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const newSceneId = () => `n${crypto.randomUUID().replace(/-/g, '').slice(0, 11)}`;

export function Storyboard({ view }: { view: EpisodeView }) {
  const router = useRouter();
  const id = view.episode.id;
  const { data: tools } = useTools();
  const { data: config } = useAppConfig();
  const { channels } = useCurrentChannel();
  const channel = channels.find((c) => c.id === view.episode.channelId) ?? null;
  const blocks = useMemo(() => blockIndex(tools), [tools]);
  const brand = useMemo(() => brandOf(channel), [channel]);
  const { draft, setDraft, dirty, reset, updateScene, removeScene, insertScene, moveScene, toInput } = useScriptDraft(view);
  const voice = useVoicePreview(view.episode.voice);
  const [useVoice, setUseVoice] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<Format>(view.episode.formats[0] ?? 'landscape');
  const [seek, setSeek] = useState<{ frame: number; nonce: number } | null>(null);
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);

  const busy = isBusy(view);
  const editable = !busy && (view.episode.status === 'script_review' || view.episode.status === 'draft');
  const voiceLines = useVoice ? voice.linesFor(draft.scenes) : undefined;
  const music = channel && channel.music !== 'none' && view.episode.music ? channel.music : null;
  const preview = useMemo(() => storyboardProps(draft.scenes, blocks, brand, { voice: voiceLines, music }), [draft.scenes, blocks, brand, voiceLines, music]);
  const total = preview.durationInFrames / FPS;
  const ordinalOf = (s: Scene) => draft.scenes.slice(0, draft.scenes.indexOf(s) + 1).filter((x) => x.block === s.block).length;

  const save = useEpisodeAction(id, () => episodeApi.saveScript(id, toInput()), 'Đã lưu kịch bản');
  const revise = useEpisodeAction(id, (feedback: string) => episodeApi.revise(id, feedback), 'AI đang sửa kịch bản…');
  const options = useEpisodeAction(id, (formats: Format[]) => episodeApi.updateOptions(id, { formats }));
  const approve = useEpisodeAction(id, async () => {
    if (dirty) await episodeApi.saveScript(id, toInput());
    return episodeApi.approveScript(id);
  });

  const onApprove = () =>
    approve.mutate(undefined, {
      onSuccess: () => router.push(`${ROUTES.episode(id)}/produce`),
    });
  const onRevise = async (feedback: string) => {
    if (!config?.llm.ready) {
      setManualFeedback(feedback);
      return;
    }
    try {
      if (dirty) await episodeApi.saveScript(id, toInput());
      revise.mutate(feedback);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const addScene = (slotId: string, ref: string) => {
    const b = blocks.get(ref);
    if (!b) return;
    const scene: Scene = { id: newSceneId(), slotId, block: ref, locked: false, narration: 'Lời đọc cho cảnh mới.', props: { ...b.defaults } };
    insertScene(scene, slotId);
    setEditing(scene.id);
  };
  const toggleFormat = (f: Format) => {
    const cur = view.episode.formats;
    const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
    if (next.length) options.mutate(next);
  };
  const jump = (s: Scene) => setSeek({ frame: (preview.starts[draft.scenes.indexOf(s)] ?? 0) + 15, nonce: Date.now() });

  const issuesFor = (s: Scene) => view.issues.filter((i) => i.sceneId === s.id);
  const general = view.issues.filter((i) => !i.sceneId);
  const editingScene = draft.scenes.find((s) => s.id === editing) ?? null;
  const target = view.durationSec;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {busy ? (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-info-soft px-4 py-3 text-small text-info">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          AI đang sửa kịch bản theo góp ý… Kịch bản mới sẽ hiện ở đây khi xong.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-label="Xem trước" className="flex flex-col gap-3">
          <div className={cn('mx-auto w-full', previewFormat === 'portrait' && 'max-w-xs')}>
            <StoryboardPlayer props={preview.props} durationInFrames={preview.durationInFrames} format={previewFormat} seek={seek} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-small">
            <span className="text-muted-foreground">Xem trước, chưa render ·</span>
            {view.episode.formats.map((f) => (
              <button key={f} type="button" onClick={() => setPreviewFormat(f)} aria-pressed={previewFormat === f} className={cn('rounded-full px-2.5 py-0.5 text-caption font-semibold', previewFormat === f ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>
                {f === 'portrait' ? '9:16' : '16:9'}
              </button>
            ))}
            <Button
              variant={useVoice ? 'secondary' : 'outline'}
              size="sm"
              className="ml-auto"
              disabled={!config?.tts || voice.loading !== null}
              onClick={async () => {
                if (!useVoice) await voice.loadAll(draft.scenes);
                setUseVoice(!useVoice);
              }}
            >
              {voice.loading ? <Loader2 className="animate-spin" aria-hidden /> : <Volume2 aria-hidden />}
              {voice.loading ? 'Đang tạo giọng đọc…' : useVoice ? 'Đang dùng giọng thật' : 'Nghe với giọng thật'}
            </Button>
          </div>
        </section>

        <section aria-label="Tổng quan kịch bản" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Tên video</Label>
            <Input id="title" value={draft.title} disabled={!editable} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-11 text-body font-semibold" />
          </div>
          <div className="flex flex-wrap gap-2 text-caption">
            <span className="rounded-full bg-muted px-2.5 py-1">{draft.scenes.length} cảnh</span>
            <span className={cn('rounded-full px-2.5 py-1', target && (total > target.max || total < target.min) ? 'bg-warning-soft text-warning' : 'bg-muted')}>
              ~{fmtDuration(total)}
              {target ? ` (mục tiêu ${fmtDuration(target.min)}–${fmtDuration(target.max)})` : ''}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1">Giọng: {config?.voices[view.episode.voice as keyof typeof config.voices] ?? view.episode.voice}</span>
          </div>
          {general.length ? (
            <ul className="flex flex-col gap-1.5">
              {general.map((i, k) => (
                <li key={k} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-small', i.level === 'error' ? 'bg-danger-soft text-destructive' : 'bg-warning-soft text-warning')}>
                  <CircleAlert className="size-4 shrink-0" aria-hidden />
                  {i.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-small text-success">
              <CircleCheck className="size-4" aria-hidden />
              Kiểm tra tự động: đạt
            </p>
          )}
          <ReviseBar onRevise={onRevise} pending={revise.isPending} disabled={!editable} />
        </section>
      </div>

      {manualFeedback !== null ? <ManualScriptPanel id={id} feedback={manualFeedback} /> : null}

      {view.slots.map((slot) => {
        const scenes = draft.scenes.filter((s) => s.slotId === slot.id);
        const canAdd = editable && slot.fill === 'ai' && scenes.length < slot.scenes.max;
        return (
          <section key={slot.id} aria-labelledby={`slot-${slot.id}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 id={`slot-${slot.id}`} className="text-title font-bold">
                {slot.name}
              </h2>
              <span className="text-caption text-muted-foreground">{slot.fill === 'locked' ? 'Khoá theo series' : `${scenes.length} cảnh · cần ${slot.scenes.min === slot.scenes.max ? slot.scenes.min : `${slot.scenes.min}–${slot.scenes.max}`}`}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scenes.map((s) => (
                <SceneCard key={s.id} scene={s} ordinal={ordinalOf(s)} blocks={blocks} brand={brand} issues={issuesFor(s)} voice={voice} onOpen={() => setEditing(s.id)} onJump={() => jump(s)} />
              ))}
              {canAdd ? <AddSceneButton refs={slot.blocks} blocks={blocks} usage={scenes.map((x) => x.block)} onAdd={(ref) => addScene(slot.id, ref)} /> : null}
            </div>
          </section>
        );
      })}

      <SceneEditor
        scene={editingScene}
        ordinal={editingScene ? ordinalOf(editingScene) : 1}
        slot={view.slots.find((s) => s.id === editingScene?.slotId)}
        blocks={blocks}
        brand={brand}
        editable={editable}
        voice={{ ...voice, narrationSrc: editingScene ? (voice.linesFor([editingScene]).get(editingScene.id)?.url ?? null) : null }}
        onChange={(patch) => editingScene && updateScene(editingScene.id, patch)}
        onMove={(dir) => editingScene && moveScene(editingScene.id, dir)}
        onRemove={() => {
          if (editingScene) removeScene(editingScene.id);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />

      {editable ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-12">
            {dirty ? (
              <>
                <span className="text-small font-semibold text-warning">● Có thay đổi chưa lưu</span>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Bỏ thay đổi
                </Button>
                <Button variant="outline" size="sm" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
                  Lưu
                </Button>
              </>
            ) : (
              <span className="hidden text-small text-muted-foreground sm:inline">Xem từng cảnh, nghe thử, sửa nếu cần.</span>
            )}
            <span className="ml-auto text-small text-muted-foreground">Xuất ra</span>
            {(['landscape', 'portrait'] as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={view.episode.formats.includes(f)}
                onClick={() => toggleFormat(f)}
                className={cn('min-h-9 rounded-lg border px-3 text-small font-semibold', view.episode.formats.includes(f) ? 'border-primary bg-accent text-accent-foreground' : 'text-muted-foreground')}
              >
                {f === 'portrait' ? '9:16' : '16:9'}
              </button>
            ))}
            <Button size="lg" className="font-bold" onClick={onApprove} disabled={approve.isPending || !draft.scenes.length}>
              {approve.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Duyệt kịch bản → Sản xuất
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
