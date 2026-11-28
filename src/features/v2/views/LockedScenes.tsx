'use client';

import { isBusy, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

/** Scenes can only change while the script is open. */
export const scenesLocked = (v: EpisodeView) => v.episode.status !== 'draft' && v.episode.status !== 'script_review';

const REASON: Partial<Record<EpisodeView['episode']['status'], string>> = {
  producing: 'Video đang được ghép, chờ xong rồi mới sửa cảnh.',
  video_review: 'Kịch bản đã duyệt, video đang chờ bạn xem. Các cảnh đang khoá.',
  published: 'Video đã duyệt. Các cảnh đang khoá.',
};

/** Says why the scene buttons are off and offers the way back. */
export function LockedScenes({ view }: { view: EpisodeView }) {
  const id = view.episode.id;
  const reopen = useEpisodeAction(id, () => episodeApi.rejectVideo(id, ''), 'Đã mở lại để sửa cảnh');
  const reason = REASON[view.episode.status];
  if (!reason) return null;
  const canReopen = view.episode.status === 'video_review' || view.episode.status === 'published';
  return (
    <div className="alert warn" style={{ justifyContent: 'space-between' }}>
      <span>
        {reason}
        {canReopen && ' Mở lại thì phải duyệt kịch bản và ghép video lần nữa.'}
      </span>
      {canReopen && (
        <button className="btn sm dark" disabled={isBusy(view) || reopen.isPending} onClick={() => reopen.mutate(undefined)}>
          Mở lại để sửa
        </button>
      )}
    </div>
  );
}
