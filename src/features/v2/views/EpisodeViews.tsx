'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { hasFailed, isBusy, useEpisode, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { useAssistantStore } from '@/stores/assistant-store';
import { downloadUrl, episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { currentStep, EPISODE_STEPS, episodeHref, stepIndex, type EpisodeStep } from '../model';
import { Loading, Page, Topbar } from '../Shell';
import { sceneHref } from './SceneDirectorView';
import { SeriesUpdateBanner } from './SeriesUpdateBanner';

const narrationOf = (v: EpisodeView) => v.episode.scenes.map((s) => s.narration).join(' ');
const blockName = (ref: unknown) => (typeof ref === 'string' ? ref : String((ref as { id?: string })?.id ?? ''));

/** One shell for every step of an episode: steps ahead of where the episode is are locked (the gates between steps). */
export function EpisodeShell({ projectId, episodeId, children }: { projectId: string; episodeId: string; children: ReactNode }) {
  const path = usePathname();
  const q = useEpisode(episodeId);
  const v = q.data;
  const active = (path.split('/').pop() ?? 'script') as EpisodeStep;
  const reached = v ? stepIndex(currentStep(v.episode.status)) : 0;
  // Storyboard opens together with the script: both describe the same scenes.
  const allowed = (i: number) => i <= Math.max(reached, 1);
  const openDirector = useAssistantStore((s) => s.setOpen);

  return (
    <>
      <Topbar crumbs={['Các tập', v ? v.episode.title || v.episode.topic : '…', EPISODE_STEPS.find((s) => s.key === active)?.label ?? '']} />
      <Page width={1240}>
        <div className="epbar">
          <div className="who">
            <span className="cap">
              Tập {v?.episode.number ?? '-'} · {v?.episode.scenes.length ?? 0} cảnh
            </span>
            <b>{v ? v.episode.title || v.episode.topic : 'Đang tải…'}</b>
          </div>
          <nav className="eptabs" aria-label="Các bước của tập">
            {EPISODE_STEPS.map((s, i) => {
              const cls = s.key === active ? 'on' : i < reached ? 'done' : '';
              return allowed(i) ? (
                <Link key={s.key} className={cls} href={episodeHref(projectId, episodeId, s.key)} aria-current={s.key === active ? 'step' : undefined}>
                  {s.label}
                </Link>
              ) : (
                <a key={s.key} aria-disabled="true" title="Xong bước trước rồi mới mở được" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  {s.label}
                </a>
              );
            })}
          </nav>
          <button className="btn sm dark" onClick={() => openDirector(true)}>
            Đạo diễn
          </button>
        </div>
        {v && <JobBanner view={v} />}
        {v && <SeriesUpdateBanner view={v} />}
        {q.isLoading ? <Loading /> : q.error ? <div className="alert bad">Không tải được tập này.</div> : children}
      </Page>
    </>
  );
}

function JobBanner({ view }: { view: EpisodeView }) {
  const retry = useEpisodeAction(view.episode.id, () => episodeApi.retry(view.episode.id), 'Đã chạy lại');
  if (isBusy(view))
    return (
      <div className="alert">
        <span style={{ flex: 1 }}>Đang chạy: {view.job?.phase ?? view.job?.kind}</span>
        <div className="bar" style={{ width: 200, alignSelf: 'center' }}>
          <i style={{ width: `${Math.round((view.job?.progress ?? 0) * 100)}%` }} />
        </div>
      </div>
    );
  if (hasFailed(view))
    return (
      <div className="alert bad">
        <span style={{ flex: 1 }}>{view.job?.error ?? 'Việc vừa chạy bị lỗi.'}</span>
        <button className="btn sm" disabled={retry.isPending} onClick={() => retry.mutate(undefined)}>
          Thử lại
        </button>
      </div>
    );
  return null;
}

/** 07 Script: scenes as lines to read, plus write / revise / approve. */
export function ScriptStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const [feedback, setFeedback] = useState('');
  const write = useEpisodeAction(episodeId, () => episodeApi.writeScript(episodeId), 'Đã giao AI viết kịch bản');
  const revise = useEpisodeAction(episodeId, (f: string) => episodeApi.revise(episodeId, f), 'Đã giao AI sửa');
  const approve = useEpisodeAction(episodeId, () => episodeApi.approveScript(episodeId), 'Đã duyệt kịch bản');
  const busy = isBusy(v);
  const scenes = v.episode.scenes;

  if (scenes.length === 0)
    return (
      <div className="card" style={{ alignItems: 'flex-start' }}>
        <h2>Chưa có kịch bản</h2>
        <p className="muted">Chủ đề: {v.episode.topic}</p>
        <button className="btn pri" disabled={busy || write.isPending} onClick={() => write.mutate(undefined)}>
          Nhờ AI viết kịch bản
        </button>
      </div>
    );

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
      <div className="col grow" style={{ gap: 12 }}>
        {v.issues.length > 0 && (
          <div className="alert warn">
            <span>{v.issues.map((i) => i.message).join(' · ')}</span>
          </div>
        )}
        {scenes.map((s, i) => (
          <div key={s.id} className="card flat">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">
                Cảnh {String(i + 1).padStart(2, '0')} · {blockName(s.block)}
              </span>
              {s.locked && <span className="chip">Cố định</span>}
            </div>
            <p className="dlg nar">{s.narration || <span className="cap">Không có lời đọc</span>}</p>
          </div>
        ))}
      </div>
      <aside className="card" style={{ flex: '0 0 340px', position: 'sticky', top: 16 }}>
        <h2>Duyệt kịch bản</h2>
        <span className="cap">
          {scenes.length} cảnh · khoảng {Math.round(narrationOf(v).split(/\s+/).length / 2.5)} giây lời đọc
        </span>
        <div className="field">
          <label htmlFor="rv">Muốn sửa gì?</label>
          <textarea id="rv" className="area" placeholder="Ví dụ: mở đầu kịch tính hơn, bớt một cảnh" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
        <button className="btn" disabled={busy || !feedback.trim() || revise.isPending} onClick={() => revise.mutate(feedback.trim(), { onSuccess: () => setFeedback('') })}>
          Nhờ AI sửa
        </button>
        <hr className="sep" />
        <button className="btn pri" disabled={busy || v.episode.status !== 'script_review' || approve.isPending} onClick={() => approve.mutate(undefined)}>
          Duyệt kịch bản
        </button>
        {v.episode.status !== 'script_review' && v.episode.status !== 'draft' && <span className="cap">Kịch bản đã được duyệt.</span>}
      </aside>
    </div>
  );
}

/** 08 Storyboard: every scene's picture and voice, generated and approved scene by scene. */
export function StoryboardStep({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const gen = useEpisodeAction(episodeId, (sceneIds: string[] | null) => episodeApi.assets(episodeId, { sceneIds, image: true, voice: true }), 'Đã giao việc tạo ảnh và giọng');
  const approve = useEpisodeAction(episodeId, (sceneIds: string[] | null) => episodeApi.approvals(episodeId, { sceneIds, approved: true }));
  const busy = isBusy(v);
  const scenes = v.episode.scenes;
  const missing = scenes.filter((s) => v.assets[s.id]?.needsImage || v.assets[s.id]?.needsVoice);

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="cap">
          {scenes.filter((s) => s.approved).length} / {scenes.length} cảnh đã duyệt · {missing.length} cảnh thiếu ảnh hoặc giọng
        </span>
        <div className="row">
          <button className="btn" disabled={busy || missing.length === 0 || gen.isPending} onClick={() => gen.mutate(missing.map((s) => s.id))}>
            Tạo ảnh và giọng còn thiếu
          </button>
          <button className="btn dark" disabled={busy || approve.isPending} onClick={() => approve.mutate(null)}>
            Duyệt tất cả cảnh sẵn sàng
          </button>
        </div>
      </div>
      <div className="grid3">
        {scenes.map((s, i) => {
          const a = v.assets[s.id];
          return (
            <div key={s.id} className={`card flat${s.approved ? ' sel' : ''}`}>
              <div className={a?.imageUrl ? 'thumb' : `thumb ${'abcde'[i % 5]}`} style={a?.imageUrl ? { background: `center / cover url(${a.imageUrl})` } : undefined}>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <p className="cap" style={{ minHeight: 36 }}>
                {s.narration.slice(0, 110)}
                {s.narration.length > 110 ? '…' : ''}
              </p>
              <div className="row" style={{ gap: 6 }}>
                {a?.imageStale && <span className="chip warn">Ảnh cũ</span>}
                {a?.voiceStale && <span className="chip warn">Giọng cũ</span>}
                {a?.voiceSeconds != null && <span className="chip mono">{a.voiceSeconds.toFixed(1)}s</span>}
                {s.approved ? <span className="chip ok">Đã duyệt</span> : a?.ready ? <span className="chip info">Sẵn sàng</span> : null}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Link className="btn sm dark" href={sceneHref(projectId, episodeId, s.id)}>
                  Đạo diễn cảnh
                </Link>
                <button className="btn sm" disabled={busy || gen.isPending} onClick={() => gen.mutate([s.id])}>
                  {a?.imageUrl ? 'Tạo lại' : 'Tạo ảnh và giọng'}
                </button>
                {!s.approved && a?.ready && (
                  <button className="btn sm dark" disabled={approve.isPending} onClick={() => approve.mutate([s.id])}>
                    Duyệt
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** 09 Production: the render job and per-scene readiness. */
export function ProductionStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const scenes = v.episode.scenes;
  const ready = scenes.filter((s) => v.assets[s.id]?.ready).length;
  return (
    <>
      <div className="grid3">
        <div className="card flat">
          <span className="eyebrow">Cảnh sẵn sàng</span>
          <b style={{ fontSize: 24 }}>
            {ready} / {scenes.length}
          </b>
          <div className="bar">
            <i style={{ width: `${scenes.length ? (ready / scenes.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="card flat">
          <span className="eyebrow">Việc đang chạy</span>
          <b style={{ fontSize: 24 }}>{v.job && isBusy(v) ? `${Math.round(v.job.progress * 100)}%` : 'Không có'}</b>
          <span className="cap">{v.job?.phase ?? ''}</span>
        </div>
        <div className="card flat">
          <span className="eyebrow">Bản dựng</span>
          <b style={{ fontSize: 24 }}>{v.renders.length}</b>
          <span className="cap">{v.renders.map((r) => r.format).join(', ')}</span>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 56 }}>Cảnh</th>
            <th>Khối</th>
            <th>Ảnh</th>
            <th>Giọng</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {scenes.map((s, i) => {
            const a = v.assets[s.id];
            return (
              <tr key={s.id}>
                <td className="mono">{String(i + 1).padStart(2, '0')}</td>
                <td className="mono">{blockName(s.block)}</td>
                <td>{a?.needsImage ? (a.imageStale ? <span className="chip warn">Cũ</span> : <span className="chip">Chưa có</span>) : <span className="chip ok">Có</span>}</td>
                <td>{a?.needsVoice ? (a.voiceStale ? <span className="chip warn">Cũ</span> : <span className="chip">Chưa có</span>) : <span className="chip ok">Có</span>}</td>
                <td>{s.approved ? <span className="chip ok"><i />Đã duyệt</span> : a?.ready ? <span className="chip info"><i />Sẵn sàng</span> : <span className="chip"><i />Đang chờ</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/** 10 Review: watch the render, approve it or send notes back. */
export function ReviewStep({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const [note, setNote] = useState('');
  const approve = useEpisodeAction(episodeId, () => episodeApi.approveVideo(episodeId), 'Đã duyệt video');
  const reject = useEpisodeAction(episodeId, (f: string) => episodeApi.rejectVideo(episodeId, f), 'Đã gửi ghi chú');
  const render = v.renders[0];
  const canDecide = v.episode.status === 'video_review' && !isBusy(v);
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
      <div className="col grow">
        {render ? (
          <video src={render.url} poster={render.thumbnailUrl ?? undefined} controls style={{ width: '100%', borderRadius: 10, background: '#000' }} />
        ) : (
          <div className="thumb b" style={{ aspectRatio: '16 / 9' }}>
            <span>Chưa có bản dựng</span>
          </div>
        )}
      </div>
      <aside className="card" style={{ flex: '0 0 360px' }}>
        <h2>Duyệt video</h2>
        <div className="field">
          <label htmlFor="rv-note">Ghi chú cần sửa</label>
          <textarea id="rv-note" className="area" placeholder="Ví dụ: cảnh 05 bị giật ở nửa sau" value={note} onChange={(e) => setNote(e.target.value)} />
          <span className="hint">Chỉ làm lại đúng phần bị ghi chú.</span>
        </div>
        <button className="btn" disabled={!canDecide || !note.trim() || reject.isPending} onClick={() => reject.mutate(note.trim(), { onSuccess: () => setNote('') })}>
          Gửi ghi chú
        </button>
        <button className="btn pri" disabled={!canDecide || approve.isPending} onClick={() => approve.mutate(undefined)}>
          Duyệt video
        </button>
        {v.episode.status === 'published' && (
          <Link className="btn" href={episodeHref(projectId, episodeId, 'publish')}>
            Sang xuất bản
          </Link>
        )}
      </aside>
    </div>
  );
}

/** 11 Publish: the publish kit and downloads. */
export function PublishStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const kit = v.episode.publish;
  const render = v.renders[0];
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
      <div className="col grow" style={{ gap: 16 }}>
        <div className="card">
          <h2>Thông tin video</h2>
          {kit ? (
            <>
              <div className="field">
                <label>Tiêu đề</label>
                <input className="input" readOnly value={kit.youtube.title} />
              </div>
              <div className="field">
                <label>Mô tả</label>
                <textarea className="area" readOnly value={kit.youtube.description} />
              </div>
              <div className="field">
                <label>Thẻ</label>
                <input className="input" readOnly value={kit.youtube.tags.join(', ')} />
              </div>
            </>
          ) : (
            <span className="cap">Bộ xuất bản có sau khi duyệt video.</span>
          )}
        </div>
      </div>
      <aside className="card" style={{ flex: '0 0 360px' }}>
        <h2>Tải về</h2>
        {render?.thumbnailUrl && <div className="thumb" style={{ background: `center / cover url(${render.thumbnailUrl})` }} />}
        {render && (
          <a className="btn pri" href={render.url} download>
            Tải MP4
          </a>
        )}
        {kit && (
          <a className="btn" href={downloadUrl.zip(episodeId)}>
            Tải bộ xuất bản (.zip)
          </a>
        )}
        <div className="alert">
          <span>Đăng thẳng lên YouTube làm ở giai đoạn sau.</span>
        </div>
      </aside>
    </div>
  );
}
