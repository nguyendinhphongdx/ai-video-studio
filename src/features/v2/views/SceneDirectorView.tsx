'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { LayoutGrid, Pause, Play, Plus, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FPS } from '@/core/domain/catalog';
import { tuneOf } from '@/core/domain/tune';
import type { Scene } from '@/core/domain/episode';
import { useFollowChannel } from '@/features/app';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { StagePlayer, type StageApi } from '@/features/episode/components/preview';
import { isBusy, useEpisode, useEpisodeAction, useTools } from '@/features/episode/hooks/use-episode';
import { blockIndex, brandOf, sceneSeconds } from '@/features/episode/lib/preview';
import { episodeApi, type SaveScriptInput } from '@/features/episode/services/episode.api';
import { seriesKeys } from '@/features/series/hooks/use-series';
import { seriesApi } from '@/features/series/services/series.api';
import { usageApi } from '@/features/usage/services/usage.api';
import { errorMessage } from '@/lib/api/client';
import { useAssistantStore } from '@/stores/assistant-store';

import { episodeHref } from '../model';
import { AiBox } from './director/AiBox';
import { retype, SceneList, sceneOps } from './director/SceneList';
import { Inspector } from './director/Inspector';
import { DragLayer } from './director/Stage';
import { AudioTab, CameraTab, CastTab, PictureTab, SceneTab, TextTab, tabsOf, type TabProps } from './director/Tabs';
import { Timeline, type LayerId, type TabId } from './director/Timeline';
import './director/responsive.css';
import { useDraft } from './director/useDraft';
import { toSaveInput } from './episode/save';
import { LockedScenes, scenesLocked } from './LockedScenes';
import { SeriesUpdateBanner } from './SeriesUpdateBanner';

const sceneHref = (projectId: string, episodeId: string, sceneId: string) => `/direct/${projectId}/${episodeId}/${sceneId}`;
export { sceneHref };

/**
 * 08b Scene director: scenes on the left, the live picture with its layers underneath, and the selected layer's
 * settings on the right. Edits stay a draft (with undo) until saved; saving withdraws the scene's approval and marks
 * its picture or voice stale (server rules). Only the buttons with a price on them cost money.
 */
export function SceneDirectorView({ projectId, episodeId, sceneId }: { projectId: string; episodeId: string; sceneId: string }) {
  const router = useRouter();
  const q = useEpisode(episodeId);
  const tools = useTools();
  const project = useChannel(projectId);
  useFollowChannel(projectId);
  const blocks = useMemo(() => blockIndex(tools.data), [tools.data]);
  const v = q.data;
  const seriesId = v?.episode.seriesId ?? '';
  const series = useQuery({ queryKey: seriesKeys.one(seriesId), queryFn: () => seriesApi.get(seriesId), enabled: Boolean(seriesId) });
  const saved = v?.episode.scenes.find((s) => s.id === sceneId) ?? null;
  const draft = useDraft(saved);
  const { dirty, undo, redo: redoEdit } = draft;
  const s = draft.value;

  const [tab, setTab] = useState<TabId>('scene');
  // A selected layer shows its own properties instead of the tabs. It belongs to one scene.
  const [picked, setPicked] = useState<{ scene: string; layer: LayerId } | null>(null);
  const layer = picked?.scene === sceneId ? picked.layer : null;
  const select = (next: LayerId | null) => setPicked(next ? { scene: sceneId, layer: next } : null);
  // Small screens keep only the picture and its layers up; the scene list and the settings open over them.
  const [sheet, setSheet] = useState<'scenes' | 'panel' | 'add' | null>(null);
  const openAssistant = useAssistantStore((x) => x.setOpen);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const player = useRef<StageApi | null>(null);
  // The screen stays up between scenes; the playhead belongs to the one being left.
  const [shown, setShown] = useState(sceneId);
  if (shown !== sceneId) {
    setShown(sceneId);
    setFrame(0);
    setPlaying(false);
  }

  const save = useEpisodeAction(episodeId, (scene: Scene) => episodeApi.saveScript(episodeId, toSaveInput(v!, { scene })), 'Đã lưu cảnh');
  const rewrite = useEpisodeAction(episodeId, (x: { input: SaveScriptInput; show: string }) => episodeApi.saveScript(episodeId, x.input));
  const gen = useEpisodeAction(episodeId, (what: { image: boolean; voice: boolean }) => episodeApi.assets(episodeId, { sceneIds: [sceneId], ...what, force: true }), 'Đã giao việc, xem tiến độ ở đầu màn hình');
  const approve = useEpisodeAction(episodeId, (approved: boolean) => episodeApi.approvals(episodeId, { sceneIds: [sceneId], approved }));
  const writePicture = useMutation({
    mutationFn: (scene: Scene) => episodeApi.suggestSceneFix(episodeId, scene.id, { request: '', narration: scene.narration, props: scene.props }).then((r) => ({ ...r, id: scene.id })),
    onSuccess: (r) => {
      draft.change((x) => (x.id === r.id ? { ...x, block: r.block, props: r.props } : x));
      toast.success(r.note || 'Đã viết lại mô tả ảnh');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const estimate = (what: 'image' | 'voice') => ({
    queryKey: ['estimate', 'scene', what, what === 'voice' ? s?.narration : '', v?.episode.voice],
    queryFn: () => usageApi.estimate({ images: what === 'image' ? 1 : 0, texts: what === 'voice' ? [s?.narration ?? ''] : [], voice: v?.episode.voice ?? '' }),
    enabled: Boolean(s && v),
    staleTime: 60_000,
  });
  const imagePrice = useQuery(estimate('image'));
  const voicePrice = useQuery(estimate('voice'));

  const closed = v ? scenesLocked(v) : true;
  const readOnly = closed || Boolean(s?.locked);
  const busy = v ? isBusy(v) : false;
  const saveNow = useCallback(() => {
    if (s && dirty && !readOnly && !busy && !save.isPending) save.mutate(s);
  }, [s, dirty, readOnly, busy, save]);

  const ids = v?.episode.scenes.map((x) => x.id) ?? [];
  const index = ids.indexOf(sceneId);
  const go = useCallback(
    (id: string) => {
      if (id === sceneId) return;
      if (dirty && !confirm('Cảnh này còn thay đổi chưa lưu. Bỏ thay đổi?')) return;
      router.push(sceneHref(projectId, episodeId, id));
    },
    [dirty, router, projectId, episodeId, sceneId],
  );

  const prevId = ids[index - 1];
  const nextId = ids[index + 1];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = e.target instanceof HTMLElement && Boolean(e.target.closest('input, textarea, select, [contenteditable]'));
      if (mod && e.key.toLowerCase() === 's') return (e.preventDefault(), saveNow());
      // Inside a text box the browser's own undo is the expected one.
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'z') return (e.preventDefault(), e.shiftKey ? redoEdit() : undo());
      if (mod || e.altKey) return;
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) return (e.preventDefault(), player.current?.toggle());
      if (e.key === 'ArrowUp' && prevId) return (e.preventDefault(), go(prevId));
      if (e.key === 'ArrowDown' && nextId) return (e.preventDefault(), go(nextId));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [saveNow, undo, redoEdit, go, prevId, nextId]);

  // Leaving the page with a draft asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const items = useMemo(() => new Set<string>((series.data?.rules.bible.library ?? []).filter((x) => x.kind === 'item').map((x) => x.id)), [series.data]);
  const block = s ? blocks.get(s.block) : undefined;

  if (!v || !s || !block) {
    const gone = v && !saved;
    return (
      <div className="ed" style={{ minHeight: '100dvh', padding: 24 }}>
        {q.error ? 'Không tải được cảnh này.' : gone ? <Link href={episodeHref(projectId, episodeId, 'script')}>Cảnh này không còn nữa. Về danh sách cảnh</Link> : 'Đang tải…'}
      </div>
    );
  }

  const assets = v.assets[sceneId];
  const tabs = tabsOf(block);
  const active = tabs.some((t) => t.id === tab) ? tab : 'scene';
  const voiceLine = assets?.voiceSeconds ? new Map([[sceneId, { url: '', seconds: assets.voiceSeconds }]]) : undefined;
  const seconds = sceneSeconds(s, blocks, voiceLine);
  // The old voice would not match edited words or delivery.
  const voiceUrl = dirty && saved && (s.narration !== saved.narration || JSON.stringify(s.props._tune) !== JSON.stringify(saved.props._tune)) ? null : (assets?.voiceUrl ?? null);
  const previewProps = { ...s.props, ...(assets?.imageUrl ? { image: assets.imageUrl } : {}), ...(s.block === 'remotion/puppet' ? { sprites: v.sprites, cast: v.cast } : {}), ...(s.block === 'remotion/picture' ? { cast: v.cast } : {}) };
  const ordinal = v.episode.scenes.slice(0, index + 1).filter((x) => x.block === s.block).length;

  const ops = sceneOps(v, blocks, sceneId);
  // People and things share one cast list. The setup list says which is which; so does how scenes already use them.
  const castIds = Object.keys(v.cast).filter((k) => !k.includes(':'));
  const used = (...keys: string[]) => new Set(v.episode.scenes.flatMap((x) => keys.map((k) => String(x.props[k] ?? ''))));
  const asPerson = used('lead', 'companion');
  const asItem = used('item');
  const isItem = (id: string) => id in v.props || items.has(id) || (asItem.has(id) && !asPerson.has(id));
  const people = castIds.filter((id) => !isItem(id));
  const known = castIds.filter(isItem);
  // An accessory is offered only when its owner is in this scene (the hero when the main place names nobody else).
  const heroId = series.data?.rules.bible.library?.find((x) => x.kind === 'hero')?.id ?? 'hero';
  const here = new Set([s.block === 'remotion/puppet' ? String(s.props.lead || heroId) : '', String(s.props.companion ?? ''), ...(tuneOf(s.props).extras ?? []).map((x) => x.id)]);
  // A painted picture does not say who is in it, so everything is offered there.
  const offered = (id: string) => s.block !== 'remotion/puppet' || !v.props[id] || here.has(v.props[id]!) || s.props.item === id;
  const things = (known.length ? known : castIds.filter((id) => !asPerson.has(id))).filter(offered);
  const apply = (x: { input: SaveScriptInput; show: string }) =>
    rewrite.mutate(x, { onSuccess: () => x.show && x.show !== sceneId && router.push(sceneHref(projectId, episodeId, x.show)) });
  const opsDisabled = dirty || busy || closed || rewrite.isPending;

  const regenerate = async (what: { image: boolean; voice: boolean }) => {
    try {
      if (dirty) await save.mutateAsync(s);
      gen.mutate(what);
    } catch {
      // The save already said what went wrong.
    }
  };
  const tabProps: TabProps = { view: v, draft, block, projectId, readOnly, busy: busy || gen.isPending || save.isPending, redo: (what) => void regenerate(what), price: { image: imagePrice.data?.usd, voice: voicePrice.data?.usd } };
  const replay = () => {
    player.current?.seek(0);
    if (!playing) player.current?.toggle();
  };

  return (
    <div className="ed director" data-sheet={sheet ?? undefined} onKeyDown={(e) => e.key === 'Escape' && setSheet(null)}>
      <header className="edtop">
        <Link className="btn sm ghost" href={episodeHref(projectId, episodeId, 'script')}>
          ←<span className="dwide"> Các cảnh</span>
        </Link>
        <div className="col" style={{ gap: 0, flex: '1 1 160px', minWidth: 0 }}>
          <span className="cap">
            {v.episode.title || v.episode.topic} · Cảnh {index + 1} / {ids.length}
          </span>
          <b className="oneline">{String(s.props.caption || s.props.heading || s.props.title || block.name)}</b>
        </div>
        <button className="btn sm ghost" disabled={!draft.canUndo || readOnly} onClick={undo} title="Hoàn tác (⌘Z)">
          ↶<span className="dwide"> Hoàn tác</span>
        </button>
        <button className="btn sm ghost" disabled={!draft.canRedo || readOnly} onClick={redoEdit} title="Làm lại (⇧⌘Z)">
          ↷
        </button>
        {dirty && <span className="chip warn dwide">Chưa lưu</span>}
        {dirty && (
          <button className="btn sm ghost" onClick={draft.reset} aria-label="Bỏ thay đổi" title="Bỏ thay đổi">
            <span className="dwide">Bỏ thay đổi</span>
            <span className="dsmall">✕</span>
          </button>
        )}
        <button className={`btn${dirty ? ' pri' : ''}`} disabled={!dirty || save.isPending || busy || readOnly} onClick={saveNow} title="⌘S">
          Lưu<span className="dwide"> cảnh</span>
        </button>
      </header>

      <div className="edbody">
        <SceneList view={v} sceneId={sceneId} blocks={blocks} canAdd={ops.canAdd} disabled={opsDisabled} open={sheet === 'scenes'} onClose={() => setSheet(null)} onOpen={(id) => (setSheet(null), go(id))} onAdd={() => (setSheet(null), apply(ops.add()))} />

        <main className="edcenter">
          <LockedScenes view={v} />
          {s.locked && <div className="alert">Cảnh này khoá theo series, chỉ xem được.</div>}
          {busy && (
            <div className="alert">
              <span>Đang chạy: {v.job?.phase ?? v.job?.kind} · {Math.round((v.job?.progress ?? 0) * 100)}%</span>
            </div>
          )}
          {v.job?.state === 'failed' && <div className="alert bad">{v.job.error ?? 'Việc vừa chạy bị lỗi.'}</div>}
          {!dirty && <SeriesUpdateBanner view={v} />}
          <div className="dstage">
            <StagePlayer key={`${sceneId}-${s.block}-${assets?.imageUrl ?? ''}`} block={s.block} props={previewProps} ordinal={ordinal} brand={brandOf(project.data ?? null)} durationSec={seconds} narrationSrc={voiceUrl} apiRef={player} onFrame={setFrame} onPlaying={setPlaying} />
            {(active === 'cast' || layer === 'hero' || layer === 'companion' || layer === 'item' || layer?.startsWith('x:')) && (s.block === 'remotion/puppet' || s.block === 'remotion/picture') && !readOnly && !playing && <DragLayer draft={draft} onSelect={select} onGrab={() => player.current?.seek(Math.round(Math.min(seconds / 2, 2) * FPS))} />}
          </div>
          <div className="transport">
            <button className="btn sm dwide" onClick={() => player.current?.toggle()} title="Phím cách">
              {playing ? '❚❚ Dừng' : '▶ Phát'}
            </button>
            <button className="btn sm ghost" onClick={() => player.current?.seek(0)}>
              ⏮
            </button>
            <span className="cap mono">
              {(frame / FPS).toFixed(1)} / {seconds.toFixed(1)}s
            </span>
            <span style={{ flex: 1 }} />
            {assets?.imageStale && <span className="chip warn">Ảnh cần vẽ lại</span>}
            {assets?.voiceStale && <span className="chip warn">Giọng cần đọc lại</span>}
          </div>
          <Timeline draft={draft} block={block} types={ops.types} people={people} things={things} seconds={seconds} voiceSeconds={assets?.voiceSeconds ?? null} frame={frame} layer={layer} readOnly={readOnly} onLayer={select} adding={sheet === 'add'} onAdding={(on) => setSheet(on ? 'add' : null)} onSeek={(f) => player.current?.seek(f)} />
          <span className="cap dwide">Phím tắt: cách = phát/dừng · ↑↓ = đổi cảnh · ⌘Z = hoàn tác · ⌘S = lưu</span>
        </main>

        <aside className="edright" aria-label="Thiết lập">
          <div className="dsheet-head dsmall">
            <b>Thiết lập cảnh</b>
            <button type="button" className="btn sm ghost" onClick={() => setSheet(null)}>
              Đóng ✕
            </button>
          </div>
          <AiBox key={sceneId} episodeId={episodeId} draft={draft} disabled={readOnly || busy} />
          {layer ? (
            <Inspector p={tabProps} layer={layer} people={people} things={things} seconds={seconds} voiceUrl={voiceUrl} writing={writePicture.isPending} onWrite={() => writePicture.mutate(s)} onReplay={replay} onSelect={select} />
          ) : (
            <>
              <div className="dtabs" role="tablist">
                {tabs.map((t) => (
                  <button key={t.id} role="tab" aria-selected={active === t.id} className={active === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="dpanel">
                {active === 'scene' && (
                  <SceneTab
                    p={tabProps}
                    types={ops.types}
                    onType={(to) => draft.change((x) => retype(x, to))}
                    ops={{ canEdit: ops.canEdit, canMove: ops.canMove, disabled: opsDisabled, duplicate: () => apply(ops.duplicate()), remove: () => apply(ops.remove()), move: (d) => apply(ops.move(d)) }}
                    approve={{ run: (x) => approve.mutate(x), disabled: dirty || busy || closed || approve.isPending }}
                    goNext={nextId ? () => go(nextId) : null}
                  />
                )}
                {active === 'picture' && <PictureTab p={tabProps} writing={writePicture.isPending} onWrite={() => writePicture.mutate(s)} />}
                {active === 'cast' && <CastTab p={tabProps} people={people} things={things} />}
                {active === 'camera' && <CameraTab p={tabProps} onReplay={replay} />}
                {active === 'text' && <TextTab p={tabProps} />}
                {active === 'audio' && <AudioTab p={tabProps} voiceUrl={voiceUrl} />}
              </div>
            </>
          )}
        </aside>
      </div>
      <nav className="dbar dsmall" aria-label="Thao tác">
        {(
          [
            { key: 'scenes', icon: LayoutGrid, label: `Cảnh ${index + 1}/${ids.length}`, run: () => setSheet(sheet === 'scenes' ? null : 'scenes') },
            { key: 'play', icon: playing ? Pause : Play, label: playing ? 'Dừng' : 'Phát', run: () => (setSheet(null), player.current?.toggle()) },
            { key: 'add', icon: Plus, label: 'Thêm lớp', off: readOnly, run: () => setSheet(sheet === 'add' ? null : 'add') },
            { key: 'panel', icon: SlidersHorizontal, label: 'Thiết lập', run: () => setSheet(sheet === 'panel' ? null : 'panel') },
            { key: 'ai', icon: Sparkles, label: 'Trợ lý', run: () => (setSheet(null), openAssistant(true)) },
          ] as { key: string; icon: LucideIcon; label: string; off?: boolean; run: () => void }[]
        ).map((a) => (
          <button key={a.key} type="button" className={sheet === a.key ? 'on' : undefined} aria-pressed={sheet === a.key} disabled={a.off} onClick={a.run}>
            <a.icon size={20} aria-hidden />
            {a.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
