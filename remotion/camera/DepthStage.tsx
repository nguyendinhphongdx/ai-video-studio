// A still picture on a 3D stage: the camera moves in perspective, a blurred copy sits behind as the far plane and
// dust drifts in front as the near plane, so the flat picture reads as having depth. The idea (multiplane layers
// moving at different speeds, perspective tilt) is adapted from video-shotcraft (Apache-2.0), see NOTICE.
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';

import { useLayout } from '../primitives';

import { poseAt, type Motion } from './moves';
import { mulberry32 } from './noise';

const PAPER_EDGE = '#EFE6CC';

function Dust({ seed, frame, shiftX, u }: { seed: number; frame: number; shiftX: number; u: number }) {
  const rand = mulberry32(seed * 7919 + 17);
  const motes = Array.from({ length: 22 }, () => ({ x: rand() * 100, y: rand() * 100, size: 2 + rand() * 7, depth: 0.6 + rand() * 1.8, vx: 0.02 + rand() * 0.05, vy: -0.01 - rand() * 0.04, alpha: 0.2 + rand() * 0.4 }));
  const scraps = Array.from({ length: 3 }, () => ({ x: rand() * 100, y: rand() * 100, w: 60 + rand() * 90, h: 18 + rand() * 30, rot: rand() * 180, depth: 2.2 + rand() * 0.8, alpha: 0.35 + rand() * 0.2 }));
  const wrap = (v: number) => ((v % 112) + 112) % 112 - 6;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {motes.map((m, i) => (
        <div
          key={`m${i}`}
          style={{
            position: 'absolute',
            left: `${wrap(m.x + m.vx * frame * m.depth - shiftX * m.depth * 1.1)}%`,
            top: `${wrap(m.y + m.vy * frame * m.depth)}%`,
            width: m.size * m.depth * u,
            height: m.size * m.depth * u,
            borderRadius: '50%',
            background: 'rgba(255,246,222,1)',
            opacity: m.alpha / m.depth + 0.05,
            filter: m.depth > 1.5 ? `blur(${1.5 * u * m.depth}px)` : undefined,
          }}
        />
      ))}
      {scraps.map((s, i) => (
        <div
          key={`s${i}`}
          style={{
            position: 'absolute',
            left: `${wrap(s.x + 0.015 * frame * s.depth - shiftX * s.depth * 1.3)}%`,
            top: `${wrap(s.y - 0.012 * frame * s.depth)}%`,
            width: s.w * u,
            height: s.h * u,
            background: '#1f1a10',
            opacity: s.alpha,
            transform: `rotate(${s.rot + frame * 0.2 * (i % 2 ? 1 : -1)}deg)`,
            clipPath: 'polygon(0 12%, 18% 0, 55% 8%, 100% 0, 92% 60%, 100% 100%, 40% 88%, 8% 100%)',
            filter: `blur(${5 * u}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

/**
 * `children` is the picture itself (full frame). With `layered` it is shown as a paper plate floating over a blurred
 * copy of itself, with dust in front; otherwise it fills the frame and only the perspective move gives depth.
 */
export function DepthStage({ children, src, move, layered, seed = 1, hidden = false }: { children: React.ReactNode; src: string | null; move: Motion; layered: boolean; seed?: number; hidden?: boolean }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u } = useLayout();
  const t = Math.min(1, frame / Math.max(1, durationInFrames));
  const p = poseAt(move, t, frame);
  const tilted = Math.abs(p.rotX) > 0.5 || Math.abs(p.rotY) > 0.5;
  if (hidden) return <></>;
  const showFar = Boolean(src) && (layered || tilted);
  return (
    <AbsoluteFill style={{ background: '#17130a', overflow: 'hidden' }}>
      {showFar ? (
        // Far plane: the same picture, soft, dim and larger; it moves a third as far as the plane in front.
        <AbsoluteFill style={{ transform: `translate(${p.x * 0.35}%, ${p.y * 0.35}%) scale(${1.32 + (p.scale - 1) * 0.4})` }}>
          <Img src={src!} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${16 * u}px) saturate(0.65) brightness(0.72)` }} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ perspective: `${1700 * u}px`, perspectiveOrigin: '50% 50%' }}>
        <AbsoluteFill style={{ transform: `translate(${p.x}%, ${p.y}%) rotateX(${p.rotX}deg) rotateY(${p.rotY}deg) rotateZ(${p.rotZ}deg) scale(${p.scale * (layered ? 0.9 : 1)})`, transformStyle: 'preserve-3d' }}>
          {layered ? (
            <AbsoluteFill style={{ padding: `${3.5 * u}%` }}>
              <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', border: `${12 * u}px solid ${PAPER_EDGE}`, boxShadow: `0 ${30 * u}px ${70 * u}px rgba(0,0,0,0.55), 0 ${6 * u}px ${14 * u}px rgba(0,0,0,0.4)`, transform: 'rotate(-0.8deg)' }}>{children}</div>
            </AbsoluteFill>
          ) : (
            children
          )}
        </AbsoluteFill>
      </AbsoluteFill>
      {layered ? <Dust seed={seed} frame={frame} shiftX={p.x} u={u} /> : null}
    </AbsoluteFill>
  );
}
