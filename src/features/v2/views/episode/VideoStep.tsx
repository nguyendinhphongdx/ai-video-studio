'use client';

import { useRef, useState } from 'react';

import { isBusy, useEpisode, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Roughly where each scene starts: voice lengths stretched over the real video length. */
function sceneStarts(v: EpisodeView, total: number): number[] {
  const lengths = v.episode.scenes.map((s) => v.assets[s.id]?.voiceSeconds ?? 4);
  const sum = lengths.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return lengths.map((n) => {
    const start = at;
    at += (n / sum) * total;
    return start;
  });
}

/** Watch the video, leave notes at the moment they apply to, approve it. */
export function VideoStep({ episodeId }: { episodeId: string }) {
  const v = useEpisode(episodeId).data!;
  const player = useRef<HTMLVideoElement>(null);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(0);
  const approve = useEpisodeAction(episodeId, () => episodeApi.approveVideo(episodeId), 'Đã duyệt video');
  const reject = useEpisodeAction(episodeId, (f: string) => episodeApi.rejectVideo(episodeId, f), 'Đã gửi ghi chú, AI đang sửa kịch bản');
  const render = v.renders[0];
  const canDecide = v.episode.status === 'video_review' && !isBusy(v);
  const old = render && (v.episode.status === 'script_review' || v.episode.status === 'draft' || v.episode.status === 'producing');

  if (!render) return <p className="muted">{v.episode.status === 'producing' ? 'Video đang được ghép, thường mất vài phút. Bạn có thể rời trang.' : 'Chưa có video.'}</p>;

  const starts = sceneStarts(v, render.durationSec);
  const playing = Math.max(0, starts.findLastIndex((s) => s <= now + 0.05));

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
      <div className="col grow" style={{ gap: 12, minWidth: 320 }}>
        {old && <div className="alert warn">Đây là video của bản trước, chưa có những thay đổi bạn vừa làm.</div>}
        <video ref={player} src={render.url} poster={render.thumbnailUrl ?? undefined} controls onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} style={{ width: '100%', maxHeight: '62vh', borderRadius: 10, background: '#000' }} />
        <span className="cap">Bấm số cảnh để tua tới (thời điểm ước lượng).</span>
        <div className="row" style={{ gap: 4 }}>
          {v.episode.scenes.map((s, i) => (
            <button
              key={s.id}
              className={`btn sm${i === playing ? ' dark' : ''}`}
              title={s.narration}
              onClick={() => {
                if (player.current) player.current.currentTime = starts[i]!;
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      {!old && (
        <aside className="card" style={{ flex: '0 0 340px' }}>
          <h2>{v.episode.status === 'published' ? 'Video đã duyệt' : 'Duyệt video'}</h2>
          {canDecide && (
            <>
              <button className="btn pri" disabled={approve.isPending} onClick={() => approve.mutate(undefined)}>
                Video đạt, duyệt
              </button>
              <hr className="sep" />
              <span className="cap">Chưa đạt? Dừng ở chỗ cần sửa rồi ghi chú.</span>
              <button
                className="btn"
                onClick={() => {
                  player.current?.pause();
                  setNote((n) => `${n}${n && !n.endsWith('\n') ? '\n' : ''}Cảnh ${playing + 1} (${clock(now)}): `);
                }}
              >
                Ghi chú tại cảnh {playing + 1}
              </button>
              <textarea className="area" aria-label="Ghi chú cần sửa" rows={5} maxLength={1000} placeholder="Ghi điều cần sửa" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn dark" disabled={!note.trim() || reject.isPending} onClick={() => reject.mutate(note.trim(), { onSuccess: () => setNote('') })}>
                Gửi AI sửa
              </button>
              <span className="hint">Video quay về bước kịch bản; sửa xong bạn duyệt cảnh bị đổi rồi ghép lại.</span>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
