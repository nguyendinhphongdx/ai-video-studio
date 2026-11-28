'use client';

import Link from 'next/link';

import { hasFailed, isBusy, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { episodeHref, lacksImage, lacksVoice, type EpisodeStep } from '../../model';

const JOB_LABEL: Record<string, string> = { plan: 'Dựng mạch chuyện', ai: 'AI đang viết', smooth: 'Làm mượt lời đọc', check: 'AI tự soát', fix: 'AI tự sửa', image: 'Vẽ ảnh', voice: 'Thu giọng', render: 'Ghép video' };

/** Says where the episode is and offers the single next action. */
export function NextStepBar({ view: v, projectId, active, onReview }: { view: EpisodeView; projectId: string; active: EpisodeStep; onReview: (index: number) => void }) {
  const id = v.episode.id;
  const retry = useEpisodeAction(id, () => episodeApi.retry(id), 'Đã chạy lại');
  const write = useEpisodeAction(id, () => episodeApi.writeScript(id), 'Đã giao AI viết kịch bản');
  const gen = useEpisodeAction(id, (sceneIds: string[]) => episodeApi.assets(id, { sceneIds, image: true, voice: true }), 'Đã giao việc tạo ảnh và giọng');
  const produce = useEpisodeAction(id, () => episodeApi.approveScript(id), 'Đã duyệt, đang ghép video');
  const scenes = v.episode.scenes;
  const missing = scenes.filter((s) => lacksImage(v.assets[s.id]) || lacksVoice(v.assets[s.id]));
  const pending = scenes.filter((s) => !s.approved);
  const images = missing.filter((s) => lacksImage(v.assets[s.id])).length;

  if (isBusy(v)) {
    const percent = Math.round((v.job?.progress ?? 0) * 100);
    return (
      <div className="alert" role="status">
        <b style={{ flex: 1 }}>
          {JOB_LABEL[v.job?.phase ?? ''] ?? v.job?.phase ?? 'Đang chạy'} · {percent}%
        </b>
        <div className="bar" style={{ width: 240, alignSelf: 'center' }}>
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  let tone = '';
  let text: string;
  let action = null;
  if (hasFailed(v)) {
    tone = 'bad';
    text = v.job?.error ?? 'Việc vừa chạy bị lỗi.';
    action = (
      <button className="btn pri" disabled={retry.isPending} onClick={() => retry.mutate(undefined)}>
        Thử lại
      </button>
    );
  } else if (v.episode.status === 'published') {
    tone = 'ok';
    text = 'Video đã duyệt. Tải về và đăng.';
    if (active !== 'publish')
      action = (
        <Link className="btn pri" href={episodeHref(projectId, id, 'publish')}>
          Sang xuất bản
        </Link>
      );
  } else if (v.episode.status === 'video_review') {
    text = 'Video đã ghép xong, chờ bạn xem và duyệt.';
    if (active !== 'review')
      action = (
        <Link className="btn pri" href={episodeHref(projectId, id, 'review')}>
          Xem video
        </Link>
      );
  } else if (v.episode.status === 'producing') {
    text = 'Đang ghép video.';
  } else if (!scenes.length) {
    text = 'Tập này chưa có kịch bản.';
    action = (
      <button className="btn pri" disabled={write.isPending} onClick={() => write.mutate(undefined)}>
        Nhờ AI viết kịch bản
      </button>
    );
  } else if (missing.length) {
    text = `Còn ${missing.length} cảnh thiếu ảnh hoặc giọng.`;
    action = (
      <button className="btn pri" disabled={gen.isPending} onClick={() => gen.mutate(missing.map((s) => s.id))}>
        Tạo cho {missing.length} cảnh{images ? ` (${images} ảnh, tốn phí)` : ''}
      </button>
    );
  } else if (pending.length) {
    text = `Đã duyệt ${scenes.length - pending.length}/${scenes.length} cảnh.`;
    action = (
      <button className="btn pri" onClick={() => onReview(scenes.findIndex((s) => !s.approved))}>
        Xem và duyệt {pending.length} cảnh
      </button>
    );
  } else {
    tone = 'ok';
    text = `Cả ${scenes.length} cảnh đã duyệt.`;
    action = (
      <button className="btn pri" disabled={v.episode.status !== 'script_review' || produce.isPending} onClick={() => produce.mutate(undefined)}>
        Ghép video
      </button>
    );
  }

  return (
    <div className={`alert ${tone}`} role="status" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <b>{text}</b>
      {action}
    </div>
  );
}
