'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Scene } from '@/core/domain/episode';
import { blockIndex } from '@/features/episode/lib/preview';
import { isBusy, useEpisode, useEpisodeAction, useTools } from '@/features/episode/hooks/use-episode';
import { SceneThumbnail } from '@/features/episode/components/preview';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { lacksImage, lacksVoice } from '../../model';
import { LockedScenes, scenesLocked } from '../LockedScenes';
import { sceneHref } from '../SceneDirectorView';
import { useReviewer } from './EpisodeShell';
import { toSaveInput } from './save';
import { SceneViewer, useDrawnScene } from './SceneViewer';

type Filter = 'all' | 'todo';

/** Script and storyboard in one place: each scene's picture, words and problems, edited and approved where they are. */
export function ScenesStep({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const tools = useTools();
  const blocks = useMemo(() => blockIndex(tools.data), [tools.data]);
  const reviewer = useReviewer();
  const [filter, setFilter] = useState<Filter>('all');
  const [feedback, setFeedback] = useState('');
  const revise = useEpisodeAction(episodeId, (f: string) => episodeApi.revise(episodeId, f), 'Đã giao AI sửa');
  const approveAll = useEpisodeAction(episodeId, () => episodeApi.approvals(episodeId, { sceneIds: v.episode.scenes.filter((s) => v.assets[s.id]?.ready).map((s) => s.id), approved: true }));
  const scenes = v.episode.scenes;
  const busy = isBusy(v);
  const locked = scenesLocked(v);
  const needsLook = (s: Scene) => !s.approved || lacksImage(v.assets[s.id]) || lacksVoice(v.assets[s.id]) || v.issues.some((i) => i.sceneId === s.id && i.level === 'error');
  const shown = scenes.map((s, i) => ({ s, i })).filter(({ s }) => filter === 'all' || needsLook(s));
  const general = v.issues.filter((i) => !i.sceneId);
  const todo = scenes.filter(needsLook).length;

  if (!scenes.length) return <p className="muted">Chủ đề: {v.episode.topic}</p>;

  return (
    <>
      <LockedScenes view={v} />
      {general.length > 0 && (
        <div className="alert warn">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {general.map((i, n) => (
              <li key={n}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="seg">
          <button className={filter === 'all' ? 'on' : undefined} onClick={() => setFilter('all')}>
            Tất cả ({scenes.length})
          </button>
          <button className={filter === 'todo' ? 'on' : undefined} onClick={() => setFilter('todo')}>
            Cần xem ({todo})
          </button>
        </div>
        <div className="row">
          <button className="btn" onClick={() => reviewer.setAt(0)}>
            Xem lần lượt
          </button>
          {!locked && scenes.some((s) => !s.approved) && (
            <button className="btn" disabled={busy || approveAll.isPending} onClick={() => approveAll.mutate(undefined)}>
              Duyệt tất cả cảnh đã đủ
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 && <p className="muted">Không còn cảnh nào cần xem.</p>}
      {shown.map(({ s, i }) => (
        <SceneRow key={s.id} view={v} scene={s} index={i} projectId={projectId} blockName={blocks.get(s.block)?.name ?? s.block} onZoom={() => reviewer.setAt(i)} />
      ))}

      {!locked && (
        <div className="card">
          <div className="field">
            <label htmlFor="rv">Muốn AI sửa cả kịch bản?</label>
            <textarea id="rv" className="area" placeholder="Ví dụ: mở đầu kịch tính hơn, bớt một cảnh" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <span className="hint">Cảnh nào bị đổi sẽ phải tạo lại ảnh hoặc giọng và duyệt lại.</span>
          </div>
          <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy || !feedback.trim() || revise.isPending} onClick={() => revise.mutate(feedback.trim(), { onSuccess: () => setFeedback('') })}>
            Nhờ AI sửa
          </button>
        </div>
      )}

      {reviewer.at !== null && scenes[reviewer.at] && <SceneViewer view={v} index={reviewer.at} onMove={reviewer.setAt} />}
    </>
  );
}

function SceneRow({ view: v, scene: s, index, projectId, blockName, onZoom }: { view: EpisodeView; scene: Scene; index: number; projectId: string; blockName: string; onZoom: () => void }) {
  const id = v.episode.id;
  const a = v.assets[s.id];
  const drawn = useDrawnScene(projectId)(s, a);
  const [text, setText] = useState<string | null>(null);
  const save = useEpisodeAction(id, (narration: string) => episodeApi.saveScript(id, toSaveInput(v, { scene: { ...s, narration } })), 'Đã lưu lời đọc');
  const approve = useEpisodeAction(id, (approved: boolean) => episodeApi.approvals(id, { sceneIds: [s.id], approved }));
  const redo = useEpisodeAction(id, (what: { image: boolean; voice: boolean }) => episodeApi.assets(id, { sceneIds: [s.id], force: true, ...what }), 'Đã giao việc tạo lại');
  const busy = isBusy(v);
  const locked = scenesLocked(v);
  const dirty = text !== null && text.trim() !== s.narration;
  const issues = v.issues.filter((i) => i.sceneId === s.id);
  const number = String(index + 1).padStart(2, '0');

  return (
    <div className={`card flat scrow${s.approved ? ' sel' : ''}`}>
      <button type="button" className={a?.imageUrl || drawn ? 'thumb' : 'thumb empty'} style={a?.imageUrl ? { background: `center / cover url(${a.imageUrl})` } : undefined} onClick={onZoom} aria-label={`Xem lớn cảnh ${number}`}>
        {drawn ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <SceneThumbnail {...drawn} />
          </div>
        ) : (
          !a?.imageUrl && <span className="hint">{a?.needsImage ? 'Chưa có ảnh' : s.locked ? 'Nền của kênh' : 'Chỉ có chữ'}</span>
        )}
        <span>{number}</span>
      </button>
      <div className="col" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="eyebrow">
            Cảnh {number} · {blockName}
          </span>
          {s.approved && <span className="chip ok">Đã duyệt</span>}
          {a?.imageStale && <span className="chip warn">Ảnh không còn khớp</span>}
          {a?.voiceStale && <span className="chip warn">Giọng không còn khớp</span>}
        </div>
        <textarea className="area" aria-label={`Lời đọc cảnh ${number}`} rows={3} maxLength={600} readOnly={locked || s.locked} value={text ?? s.narration} onChange={(e) => setText(e.target.value)} />
        {dirty && (
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm dark" disabled={busy || save.isPending} onClick={() => save.mutate(text.trim(), { onSuccess: () => setText(null) })}>
              Lưu lời
            </button>
            <button className="btn sm ghost" onClick={() => setText(null)}>
              Bỏ thay đổi
            </button>
          </div>
        )}
        {a?.voiceUrl && !dirty && <audio controls preload="none" src={a.voiceUrl} style={{ height: 32, maxWidth: 360 }} />}
        {issues.map((i, n) => (
          <span key={n} className={`chip ${i.level === 'error' ? 'bad' : 'warn'}`} style={{ alignSelf: 'flex-start', borderRadius: 6 }}>
            {i.message}
          </span>
        ))}
      </div>
      <div className="acts">
        {!locked &&
          (s.approved ? (
            <button className="btn sm" disabled={busy || approve.isPending} onClick={() => approve.mutate(false)}>
              Bỏ duyệt
            </button>
          ) : (
            <button className="btn sm dark" disabled={busy || dirty || !a?.ready || approve.isPending} onClick={() => approve.mutate(true)}>
              Duyệt
            </button>
          ))}
        {!locked && a?.needsImage && (
          <button className="btn sm" disabled={busy || dirty || redo.isPending} onClick={() => redo.mutate({ image: true, voice: false })}>
            {a.imageUrl ? 'Vẽ lại ảnh' : 'Vẽ ảnh'}
          </button>
        )}
        {!locked && a?.needsVoice && (
          <button className="btn sm" disabled={busy || dirty || redo.isPending} onClick={() => redo.mutate({ image: false, voice: true })}>
            {a.voiceUrl ? 'Thu lại giọng' : 'Thu giọng'}
          </button>
        )}
        <Link className="btn sm ghost" href={sceneHref(projectId, id, s.id)}>
          Chỉnh chi tiết
        </Link>
      </div>
    </div>
  );
}
