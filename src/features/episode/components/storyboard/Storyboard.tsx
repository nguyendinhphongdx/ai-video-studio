'use client';

import { CircleAlert, CircleCheck, ImageIcon, Loader2, Play, Plus, Volume2, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { FPS, type Format } from '@/core/domain/catalog';
import { emptyAssets, type Scene } from '@/core/domain/episode';
import { makePlan } from '@/core/scenes/make-plan';
import { useAppConfig, useCurrentChannel } from '@/features/app';
import { cn } from '@/lib/utils';

import { useEstimate } from '@/features/usage/hooks/use-usage';
import { fmtUsd } from '@/features/usage/lib/format';

import { isBusy, useEpisodeAction, useTools } from '../../hooks/use-episode';
import { blockIndex, brandOf, musicSrc, storyboardProps, type VoiceLine } from '../../lib/preview';
import { fmtDuration } from '../../lib/status';
import { episodeApi, type EpisodeView } from '../../services/episode.api';
import { StoryboardPlayer } from '../preview';

import { AskAiButton } from '@/features/assistant/components/AskAiButton';

import { MakeAllDialog } from './MakeAllDialog';
import { QuickReview } from './QuickReview';
import { SceneCard } from './SceneCard';
import { SceneEditor } from './SceneEditor';
import { useScriptDraft } from './use-script-draft';

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
  const [useVoice, setUseVoice] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<Format>(view.episode.formats[0] ?? 'landscape');
  const [seek, setSeek] = useState<{ frame: number; nonce: number } | null>(null);
  const [makeOpen, setMakeOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSeek, setReviewSeek] = useState<{ frame: number; nonce: number } | null>(null);
  /** "Duyệt luôn" was ticked: approve what is ready once the picture/voice job has finished. */
  const [approveAfter, setApproveAfter] = useState(false);

  const busy = isBusy(view);
  const assetJob = view.job && view.job.kind === 'scene_assets' && (view.job.state === 'queued' || view.job.state === 'running') ? view.job : null;
  const assetTargets = (assetJob?.payload.sceneIds as string[] | null | undefined) ?? null;
  const isWorking = (sceneId: string) => Boolean(assetJob && (assetTargets === null || assetTargets.includes(sceneId)));
  const editable = !busy && (view.episode.status === 'script_review' || view.episode.status === 'draft');
  // Real pictures and voices that match each scene's current content (stale ones are ignored until regenerated).
  const voiceLines = useMemo(() => {
    const m = new Map<string, VoiceLine>();
    for (const s of draft.scenes) {
      const a = view.assets[s.id];
      if (a?.voiceUrl && a.voiceSeconds) m.set(s.id, { url: a.voiceUrl, seconds: a.voiceSeconds });
    }
    return m;
  }, [draft.scenes, view.assets]);
  const images = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of draft.scenes) {
      const url = view.assets[s.id]?.imageUrl;
      if (url) m.set(s.id, url);
    }
    return m;
  }, [draft.scenes, view.assets]);
  const music = view.episode.music ? musicSrc(channel?.music) : null;
  const preview = useMemo(() => storyboardProps(draft.scenes, blocks, brand, { voice: useVoice ? voiceLines : undefined, images, music }), [draft.scenes, blocks, brand, voiceLines, images, useVoice, music]);
  const total = preview.durationInFrames / FPS;
  const ordinalOf = (s: Scene) => draft.scenes.slice(0, draft.scenes.indexOf(s) + 1).filter((x) => x.block === s.block).length;

  const save = useEpisodeAction(id, () => episodeApi.saveScript(id, toInput()), 'Đã lưu kịch bản');
  const options = useEpisodeAction(id, (formats: Format[]) => episodeApi.updateOptions(id, { formats }));
  /** Pictures, voices and approvals work on saved scenes, so unsaved edits are saved first. */
  const saveFirst = async () => {
    if (dirty) await episodeApi.saveScript(id, toInput());
  };
  const assets = useEpisodeAction(id, async (a: { sceneIds: string[] | null; image: boolean; voice: boolean }) => {
    await saveFirst();
    return episodeApi.assets(id, a);
  }, 'Đã giao cho worker tạo, kết quả hiện ngay khi xong');
  const approval = useEpisodeAction(id, async (a: { sceneIds: string[] | null; approved: boolean }) => {
    await saveFirst();
    return episodeApi.approvals(id, a);
  });
  const autos = useEpisodeAction(id, (o: { autoImages?: boolean; autoVoice?: boolean }) => episodeApi.updateOptions(id, o));
  const approve = useEpisodeAction(id, async () => {
    await saveFirst();
    return episodeApi.approveScript(id);
  });

  const onApprove = () =>
    approve.mutate(undefined, {
      onSuccess: () => router.push(`${ROUTES.episode(id)}/produce`),
    });
  const addScene = (slotId: string, ref: string) => {
    const b = blocks.get(ref);
    if (!b) return;
    const scene: Scene = { id: newSceneId(), slotId, block: ref, locked: false, narration: 'Lời đọc cho cảnh mới.', props: { ...b.defaults }, approved: false, assets: emptyAssets() };
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
  const approvedCount = draft.scenes.filter((x) => x.approved).length;
  const missingImages = draft.scenes.filter((x) => view.assets[x.id]?.needsImage && !view.assets[x.id]?.imageUrl).length;
  const missingVoices = draft.scenes.filter((x) => view.assets[x.id]?.needsVoice && !view.assets[x.id]?.voiceUrl).length;
  const imageCost = useEstimate(missingImages, [], '');
  const voiceTexts = draft.scenes.filter((x) => view.assets[x.id]?.needsVoice && !view.assets[x.id]?.voiceUrl && x.narration.trim()).map((x) => x.narration);
  const voiceCost = useEstimate(0, voiceTexts, view.episode.voice);
  const approvable = draft.scenes.filter((x) => !x.approved && view.assets[x.id]?.ready);
  const plan = useMemo(() => makePlan(draft.scenes, view.assets, new Set(draft.scenes.filter((x) => x.approved).map((x) => x.id))), [draft.scenes, view.assets]);
  const reviewPreview = useMemo(() => (reviewOpen ? storyboardProps(draft.scenes, blocks, brand, { voice: voiceLines, images, music }) : null), [reviewOpen, draft.scenes, blocks, brand, voiceLines, images, music]);
  useEffect(() => {
    if (!approveAfter || assetJob || assets.isPending || approval.isPending) return;
    setApproveAfter(false);
    if (approvable.length) approval.mutate({ sceneIds: approvable.map((x) => x.id), approved: true });
  }, [approveAfter, assetJob, assets.isPending, approval, approvable]);
  const allApproved = !dirty && draft.scenes.length > 0 && approvedCount === draft.scenes.length;
  const play = (sceneId: string) => {
    const url = view.assets[sceneId]?.voiceUrl;
    audio.current?.pause();
    if (!url || playingId === sceneId) return setPlayingId(null);
    audio.current = new Audio(url);
    audio.current.onended = () => setPlayingId(null);
    setPlayingId(sceneId);
    void audio.current.play().catch(() => setPlayingId(null));
  };

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
            <Button variant={useVoice ? 'secondary' : 'outline'} size="sm" className="ml-auto" disabled={!voiceLines.size} onClick={() => setUseVoice(!useVoice)}>
              <Volume2 aria-hidden />
              {!voiceLines.size ? 'Chưa có giọng nào' : useVoice ? `Đang nghe giọng thật (${voiceLines.size}/${draft.scenes.length} cảnh)` : 'Nghe với giọng thật'}
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
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5" aria-label="Tiến độ duyệt cảnh">
            <div className="flex items-center justify-between gap-3 text-small font-semibold">
              <span>
                {approvedCount}/{draft.scenes.length} cảnh đã duyệt
              </span>
              <span className="text-caption font-normal text-muted-foreground">Duyệt hết mới sản xuất (ghép video)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={approvedCount} aria-valuemin={0} aria-valuemax={draft.scenes.length} aria-label="Cảnh đã duyệt">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${draft.scenes.length ? (approvedCount / draft.scenes.length) * 100 : 0}%` }} />
            </div>
            {editable ? (
              <div className="flex flex-wrap gap-2">
                {!plan.empty ? (
                  <Button size="sm" disabled={!!assetJob || assets.isPending} onClick={() => setMakeOpen(true)}>
                    <Wand2 aria-hidden />
                    Làm hết giúp tôi
                  </Button>
                ) : null}
                {plan.empty && !!approvable.length && !assetJob ? (
                  <Button size="sm" onClick={() => setReviewOpen(true)}>
                    <Play aria-hidden />
                    Duyệt nhanh
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" disabled={!!assetJob || assets.isPending || !missingImages} onClick={() => assets.mutate({ sceneIds: null, image: true, voice: false })}>
                  <ImageIcon aria-hidden />
                  Tạo ảnh còn thiếu{missingImages ? ` (${missingImages})` : ''}{missingImages && imageCost?.usd != null ? ` ≈ ${fmtUsd(imageCost.usd)}` : ''}
                </Button>
                <Button variant="outline" size="sm" disabled={!!assetJob || assets.isPending || !missingVoices} onClick={() => assets.mutate({ sceneIds: null, image: false, voice: true })}>
                  <Volume2 aria-hidden />
                  Tạo giọng còn thiếu{missingVoices ? ` (${missingVoices})` : ''}{missingVoices && voiceCost?.usd != null ? (voiceCost.usd === 0 ? ' · miễn phí' : ` ≈ ${fmtUsd(voiceCost.usd)}`) : ''}
                </Button>
                <Button size="sm" disabled={!!assetJob || approval.isPending || !approvable.length} onClick={() => approval.mutate({ sceneIds: approvable.map((x) => x.id), approved: true })}>
                  <CircleCheck aria-hidden />
                  Duyệt các cảnh đã đủ{approvable.length ? ` (${approvable.length})` : ''}
                </Button>
              </div>
            ) : null}
            {assetJob ? (
              <p role="status" className="flex items-center gap-2 text-caption text-info">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Worker đang tạo ảnh/giọng… {Math.round(assetJob.progress * 100)}%
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-2.5 text-small">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-primary" checked={view.episode.autoImages} disabled={!editable} onChange={(e) => autos.mutate({ autoImages: e.target.checked })} />
                Tự tạo ảnh khi AI viết xong
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-primary" checked={view.episode.autoVoice} disabled={!editable} onChange={(e) => autos.mutate({ autoVoice: e.target.checked })} />
                Tự tạo giọng khi AI viết xong
              </label>
              <span className="text-caption text-muted-foreground">Tắt thì chỉ tạo khi bạn bấm (tiết kiệm lượt gọi).</span>
            </div>
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
        </section>
      </div>

      {view.slots.map((slot) => {
        const scenes = draft.scenes.filter((s) => s.slotId === slot.id);
        const canAdd = editable && slot.fill === 'ai' && scenes.length < slot.scenes.max;
        return (
          <section key={slot.id} aria-labelledby={`slot-${slot.id}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 id={`slot-${slot.id}`} className="text-title font-bold">
                {slot.name}
              </h2>
              {editable && slot.fill === 'ai' && scenes.length > 1 ? (
                <span className="ml-auto">
                  <AskAiButton
                    label="Biên tập mạch chuyện"
                    title="Nhờ AI biên tập lại mạch chuyện"
                    prompt={`Biên tập lại mạch chuyện và lời đọc của video này (dùng revise_script, giữ nguyên ảnh/giọng của cảnh không đổi).\nChủ đề: ${view.episode.topic}\nHiện ${scenes.length} cảnh. Lời đọc đang như sau:\n${scenes.map((x, i) => `${i + 1}. ${x.narration}`).join('\n')}\n\nCần sửa: lời đọc nghe còn gượng, giống văn viết, các cảnh rời rạc. Hãy viết lại để nghe như người đang kể: xen câu dài với câu rất ngắn, nói với người xem ("bạn"), có vài câu hỏi dẫn dắt, mỗi cảnh kết bằng một mồi sang cảnh sau, có một bước ngoặt, và một cảnh kết thật sự trả lời câu hỏi mở đầu (lời chào kênh chỉ đứng sau cảnh kết). Bỏ từ sách vở sáo rỗng, thay bằng chi tiết cụ thể.\n\nThêm yêu cầu riêng: [ví dụ: kể như một cuộc điều tra, thêm một nhân vật cụ thể].`}
                  />
                </span>
              ) : null}
              <span className="text-caption text-muted-foreground">{slot.fill === 'locked' ? 'Khoá theo series' : `${scenes.length} cảnh · cần ${slot.scenes.min === slot.scenes.max ? slot.scenes.min : `${slot.scenes.min}–${slot.scenes.max}`}`}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scenes.map((s) => (
                <SceneCard
                  key={s.id}
                  scene={s}
                  index={draft.scenes.indexOf(s)}
                  ordinal={ordinalOf(s)}
                  blocks={blocks}
                  brand={brand}
                  issues={issuesFor(s)}
                  assets={view.assets[s.id]}
                  working={isWorking(s.id)}
                  editable={editable}
                  playingId={playingId}
                  onPlay={() => play(s.id)}
                  onGenerate={(what) => assets.mutate({ sceneIds: [s.id], image: what === 'image', voice: what === 'voice' })}
                  onApprove={(approved) => approval.mutate({ sceneIds: [s.id], approved })}
                  onOpen={() => setEditing(s.id)}
                  onJump={() => jump(s)}
                />
              ))}
              {canAdd ? <AddSceneButton refs={slot.blocks} blocks={blocks} usage={scenes.map((x) => x.block)} onAdd={(ref) => addScene(slot.id, ref)} /> : null}
            </div>
          </section>
        );
      })}

      <MakeAllDialog
        open={makeOpen}
        onOpenChange={setMakeOpen}
        plan={plan}
        channelId={view.episode.channelId}
        voice={view.episode.voice}
        pending={assets.isPending}
        onConfirm={(after) =>
          assets.mutate(
            { sceneIds: null, image: true, voice: true },
            {
              onSuccess: () => {
                setMakeOpen(false);
                setApproveAfter(after);
              },
            },
          )
        }
      />
      {reviewPreview ? (
        <QuickReview
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          props={reviewPreview.props}
          durationInFrames={reviewPreview.durationInFrames}
          format={previewFormat}
          starts={reviewPreview.starts}
          seek={reviewSeek}
          onSeek={(i) => setReviewSeek({ frame: (reviewPreview.starts[i] ?? 0) + 15, nonce: Date.now() })}
          scenes={draft.scenes.map((x, i) => {
            const a = view.assets[x.id];
            return { id: x.id, label: x.narration || `Cảnh ${i + 1}`, approved: x.approved, ready: Boolean(a?.ready), problem: a?.ready ? null : a?.needsImage && !a.imageUrl ? 'Chưa có ảnh' : a?.needsVoice && !a.voiceUrl ? 'Chưa có giọng' : 'Ảnh hoặc giọng không còn khớp nội dung' };
          })}
          pending={approval.isPending}
          onApproveAll={() =>
            approval.mutate(
              { sceneIds: approvable.map((x) => x.id), approved: true },
              { onSuccess: () => setReviewOpen(false) },
            )
          }
          onBack={(sceneId) => {
            setReviewOpen(false);
            if (sceneId) setEditing(sceneId);
          }}
        />
      ) : null}
      <SceneEditor
        scene={editingScene}
        ordinal={editingScene ? ordinalOf(editingScene) : 1}
        position={editingScene ? draft.scenes.indexOf(editingScene) + 1 : 1}
        slot={view.slots.find((s) => s.id === editingScene?.slotId)}
        blocks={blocks}
        brand={brand}
        editable={editable}
        assets={editingScene ? view.assets[editingScene.id] : undefined}
        working={editingScene ? isWorking(editingScene.id) : false}
        onGenerate={(what) => editingScene && assets.mutate({ sceneIds: [editingScene.id], image: what === 'image', voice: what === 'voice' })}
        onApprove={(approved) => editingScene && approval.mutate({ sceneIds: [editingScene.id], approved })}
        onChange={(patch) => editingScene && updateScene(editingScene.id, patch)}
        onMove={(dir) => editingScene && moveScene(editingScene.id, dir)}
        onRemove={() => {
          if (editingScene) removeScene(editingScene.id);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />

      {editable ? (
        <div data-action-bar className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:left-60">
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
              <span className="hidden text-small text-muted-foreground sm:inline">Mỗi cảnh: sửa, tạo ảnh, tạo giọng rồi duyệt.</span>
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
            <Button size="lg" className="font-bold" onClick={onApprove} disabled={approve.isPending || !allApproved} title={allApproved ? undefined : dirty ? 'Lưu thay đổi và duyệt lại các cảnh vừa sửa' : `Còn ${draft.scenes.length - approvedCount} cảnh chưa duyệt`}>
              {approve.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {allApproved ? 'Ghép và sản xuất video' : `Duyệt hết cảnh để sản xuất (${approvedCount}/${draft.scenes.length})`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
