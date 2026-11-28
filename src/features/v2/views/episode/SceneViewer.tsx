'use client';

import { useEffect, useRef } from 'react';

import type { Scene } from '@/core/domain/episode';
import { useChannel } from '@/features/channel/hooks/use-channels';
import { ScenePlayer } from '@/features/episode/components/preview';


import { isBusy, useEpisodeAction, useTools } from '@/features/episode/hooks/use-episode';
import { blockIndex, brandOf, sceneSeconds } from '@/features/episode/lib/preview';
import { episodeApi, type EpisodeView } from '@/features/episode/services/episode.api';

import { scenesLocked } from '../LockedScenes';

/** Intro, outro and text scenes have no picture of their own: the template and the project's brand draw them. */
export function useDrawnScene(projectId: string) {
  const tools = useTools();
  const channel = useChannel(projectId).data ?? null;
  const blocks = blockIndex(tools.data);
  const brand = brandOf(channel);
  return (s: Scene, a: EpisodeView['assets'][string] | undefined) => {
    // Puppet and picture scenes need the series cast to be drawn, which is not at hand here.
    if (!channel || a?.imageUrl || a?.needsImage || !blocks.get(s.block)?.previewable || s.block === 'remotion/puppet' || s.block === 'remotion/picture') return null;
    return { block: s.block, props: s.props, ordinal: 1, brand, durationSec: sceneSeconds(s, blocks) };
  };
}

/** One scene at a time, large: arrows move, Enter approves and goes to the next one waiting, Esc closes. */
export function SceneViewer({ view: v, index, onMove }: { view: EpisodeView; index: number; onMove: (index: number | null) => void }) {
  const id = v.episode.id;
  const scenes = v.episode.scenes;
  const s = scenes[index]!;
  const a = v.assets[s.id];
  const approve = useEpisodeAction(id, (approved: boolean) => episodeApi.approvals(id, { sceneIds: [s.id], approved }));
  const locked = scenesLocked(v);
  const canApprove = !locked && !isBusy(v) && !s.approved && Boolean(a?.ready) && !approve.isPending;
  const drawn = useDrawnScene(v.episode.channelId)(s, a);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);

  const step = (by: number) => onMove(Math.min(scenes.length - 1, Math.max(0, index + by)));
  const approveAndNext = () =>
    approve.mutate(true, {
      onSuccess: () => {
        const next = scenes.findIndex((x, i) => i > index && !x.approved);
        onMove(next < 0 ? null : next);
      },
    });

  return (
    <div
      ref={box}
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Cảnh ${index + 1}`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onMove(null);
        else if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'Enter' && e.target === box.current && canApprove) approveAndNext();
      }}
    >
      <b>
        Cảnh {index + 1} / {scenes.length}
        {s.approved ? ' · đã duyệt' : ''}
      </b>
      {drawn ? (
        <div style={{ width: 'min(960px, 100%)' }}>
          <ScenePlayer key={s.id} {...drawn} />
        </div>
      ) : a?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imageUrl} alt="" />
      ) : (
        <span>{a?.needsImage ? 'Chưa có ảnh' : 'Cảnh này không dùng ảnh'}</span>
      )}
      <p>{s.narration}</p>
      {a?.voiceUrl && <audio key={s.id} controls autoPlay src={a.voiceUrl} />}
      <div className="row">
        <button className="btn ghost" disabled={index === 0} onClick={() => step(-1)}>
          ← Trước
        </button>
        {!locked &&
          (s.approved ? (
            <button className="btn" disabled={isBusy(v) || approve.isPending} onClick={() => approve.mutate(false)}>
              Bỏ duyệt
            </button>
          ) : (
            <button className="btn pri" disabled={!canApprove} onClick={approveAndNext}>
              Duyệt (Enter)
            </button>
          ))}
        <button className="btn ghost" disabled={index === scenes.length - 1} onClick={() => step(1)}>
          Sau →
        </button>
        <button className="btn ghost" onClick={() => onMove(null)}>
          Đóng (Esc)
        </button>
      </div>
    </div>
  );
}
