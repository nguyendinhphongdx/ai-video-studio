'use client';

import { isBusy, useEpisodeAction } from '@/features/episode/hooks/use-episode';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

/**
 * The series changed after this episode was written (new characters, poses, bible or format): offer to move the episode
 * onto the current version. Nothing is regenerated; previews and the next render use the new version.
 */
export function SeriesUpdateBanner({ view }: { view: EpisodeView }) {
  const move = useEpisodeAction(view.episode.id, () => episodeApi.useLatestSeries(view.episode.id), 'Tập đã dùng bộ nhân vật mới nhất');
  const { used, current } = view.series;
  if (used == null || current == null || used >= current || view.episode.status === 'published' || isBusy(view)) return null;
  return (
    <div className="alert">
      <span style={{ flex: 1 }}>
        Series đã có bản {current} (tập đang dùng bản {used}): nhân vật, tư thế hoặc luật của series đã đổi. Dùng bản mới thì cảnh xem trước và lần dựng sau lấy theo bản mới; kịch bản giữ nguyên, không tốn tiền.
      </span>
      <button className="btn sm dark" disabled={move.isPending} onClick={() => move.mutate(undefined)}>
        Dùng bộ nhân vật mới nhất
      </button>
    </div>
  );
}
