import type { Scene } from '@/core/domain/episode';
import type { EpisodeView } from '@/features/episode/services/episode.api';

/** The save endpoint takes the whole script; callers change one scene or the publish kit. */
export function toSaveInput(v: EpisodeView, change: { scene?: Scene; publish?: EpisodeView['episode']['publish'] }) {
  return {
    title: v.episode.title,
    publish: change.publish ?? v.episode.publish,
    scenes: v.episode.scenes.map((s) => {
      const x = change.scene && s.id === change.scene.id ? change.scene : s;
      return { id: x.id, slotId: x.slotId, block: String(x.block), locked: x.locked, narration: x.narration, props: x.props };
    }),
  };
}
