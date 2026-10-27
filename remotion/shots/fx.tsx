// Light and graphic overlays over a picture, one per scene at most. Pure functions of the frame number. The ideas
// (sheen and spotlight sweeps, scan line, reticle lock-on, ripples, impact burst, glow orbs with fly lines) come from the
// effect recipes of video-shotcraft (Apache-2.0), see NOTICE.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { mulberry32 } from '../camera/noise';
import { useLayout } from '../primitives';

import type { FxId } from './fx-meta';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const span = (frame: number, a: number, b: number, e: (t: number) => number = (t) => t) => e(interpolate(frame, [a, b], [0, 1], clamp));

function Sheen({ frame, dur }: { frame: number; dur: number }) {
  const t = span(frame, dur * 0.18, dur * 0.55, inOut);
  return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: t > 0 && t < 1 ? 0.55 : 0, background: `linear-gradient(105deg, transparent ${t * 140 - 30}%, rgba(255,255,255,0.75) ${t * 140 - 10}%, transparent ${t * 140 + 10}%)` }} />;
}

function Spotlight({ frame, dur }: { frame: number; dur: number }) {
  const x = interpolate(frame, [0, dur], [12, 88], clamp);
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 34% 62% at ${x}% 48%, transparent 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.62) 100%)` }} />;
}

function Scan({ frame, dur, accent, u }: { frame: number; dur: number; accent: string; u: number }) {
  const t = span(frame, dur * 0.12, dur * 0.7, inOut);
  return (
    <AbsoluteFill style={{ opacity: t > 0 && t < 1 ? 1 : 0 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: `${t * 100}%`, height: 3 * u, background: accent, boxShadow: `0 0 ${30 * u}px ${12 * u}px ${accent}` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: `${Math.max(0, t * 100 - 18)}%`, height: '18%', background: `linear-gradient(to bottom, transparent, ${accent}33)` }} />
    </AbsoluteFill>
  );
}

function Reticle({ frame, accent, u }: { frame: number; accent: string; u: number }) {
  // Four corner brackets fly in from outside, overshoot a little and lock around the middle of the picture.
  const t = span(frame, 10, 30);
  const k = 1 + (1 - t) * 0.9 + Math.sin(t * Math.PI) * -0.0 + (t > 0.7 ? Math.sin((t - 0.7) / 0.3 * Math.PI) * -0.04 : 0);
  const w = 520 * u * k;
  const h = 300 * u * k;
  const arm = 56 * u;
  const corner = (x: number, y: number, rot: number) => <div style={{ position: 'absolute', left: `calc(50% + ${x * w / 2}px)`, top: `calc(50% + ${y * h / 2}px)`, width: arm, height: arm, borderTop: `${5 * u}px solid ${accent}`, borderLeft: `${5 * u}px solid ${accent}`, transform: `translate(-50%, -50%) rotate(${rot}deg)`, transformOrigin: 'center' }} />;
  return <AbsoluteFill style={{ opacity: span(frame, 8, 16) }}>{corner(-1, -1, 0)}{corner(1, -1, 90)}{corner(1, 1, 180)}{corner(-1, 1, 270)}</AbsoluteFill>;
}

function LightLeak({ frame, dur }: { frame: number; dur: number }) {
  const t = frame / Math.max(1, dur);
  return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.55 + 0.25 * Math.sin(frame / 14), background: `radial-gradient(ellipse at ${100 - t * 50}% 12%, rgba(255,170,90,0.9), rgba(255,90,140,0.4) 35%, transparent 65%)` }} />;
}

function Ripple({ frame, accent, u }: { frame: number; accent: string; u: number }) {
  return (
    <AbsoluteFill>
      {[0, 1, 2].map((i) => {
        const t = span(frame, 12 + i * 12, 60 + i * 12, easeOut);
        return <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 1400 * u * t, height: 1400 * u * t, borderRadius: '50%', border: `${3 * u}px solid ${accent}`, opacity: (1 - t) * 0.6, transform: 'translate(-50%, -50%)' }} />;
      })}
    </AbsoluteFill>
  );
}

function Burst({ frame, accent }: { frame: number; accent: string }) {
  const life = interpolate(frame, [4, 6, 18], [0, 1, 0], clamp);
  const rays = Array.from({ length: 36 }, (_, i) => `transparent ${(i * 10).toFixed(0)}deg, ${accent} ${(i * 10 + 1.2).toFixed(0)}deg, transparent ${(i * 10 + 3.4).toFixed(0)}deg`).join(', ');
  return (
    <AbsoluteFill style={{ opacity: life * 0.8, mixBlendMode: 'screen' }}>
      <AbsoluteFill style={{ background: `conic-gradient(from 0deg at 50% 50%, ${rays}, transparent 360deg)`, maskImage: 'radial-gradient(circle at 50% 50%, transparent 14%, black 40%, black 70%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 14%, black 40%, black 70%, transparent 100%)' }} />
    </AbsoluteFill>
  );
}

function Aurora({ frame, accent }: { frame: number; accent: string }) {
  return (
    <AbsoluteFill style={{ mixBlendMode: 'soft-light', opacity: 0.8 }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 40% at ${30 + Math.sin(frame / 40) * 18}% ${70 + Math.cos(frame / 33) * 8}%, ${accent}, transparent 70%), radial-gradient(ellipse 45% 40% at ${72 + Math.cos(frame / 37) * 16}% ${28 + Math.sin(frame / 29) * 10}%, #7c4dff, transparent 70%)` }} />
    </AbsoluteFill>
  );
}

function GlowOrbs({ frame, dur, accent, u }: { frame: number; dur: number; accent: string; u: number }) {
  const { width, height } = useVideoConfig();
  const rand = mulberry32(21);
  const orbs = Array.from({ length: 3 }, () => ({ x: 0.18 + rand() * 0.64, y: 0.2 + rand() * 0.6 }));
  const draw = span(frame, 8, dur * 0.7, inOut);
  const path = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ax = a.x * width, ay = a.y * height, bx = b.x * width, by = b.y * height;
    return `M ${ax} ${ay} Q ${(ax + bx) / 2} ${Math.min(ay, by) - 160 * u} ${bx} ${by}`;
  };
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      <svg width={width} height={height}>
        {[[0, 1], [1, 2]].map(([a, b], i) => <path key={i} d={path(orbs[a!]!, orbs[b!]!)} fill="none" stroke={accent} strokeWidth={3 * u} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} opacity={0.85} style={{ filter: `drop-shadow(0 0 ${10 * u}px ${accent})` }} />)}
        {orbs.map((o, i) => <circle key={i} cx={o.x * width} cy={o.y * height} r={(14 + Math.sin(frame / 10 + i) * 3) * u} fill={accent} style={{ filter: `drop-shadow(0 0 ${22 * u}px ${accent})` }} opacity={span(frame, 4 + i * 5, 14 + i * 5)} />)}
      </svg>
    </AbsoluteFill>
  );
}

/** One overlay over the picture. `none` draws nothing. */
export function FxLayer({ kind, accent }: { kind: FxId; accent: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const { u } = useLayout();
  switch (kind) {
    case 'sheen':
      return <Sheen frame={frame} dur={dur} />;
    case 'spotlight':
      return <Spotlight frame={frame} dur={dur} />;
    case 'scan':
      return <Scan frame={frame} dur={dur} accent={accent} u={u} />;
    case 'reticle':
      return <Reticle frame={frame} accent={accent} u={u} />;
    case 'light-leak':
      return <LightLeak frame={frame} dur={dur} />;
    case 'ripple':
      return <Ripple frame={frame} accent={accent} u={u} />;
    case 'burst':
      return <Burst frame={frame} accent={accent} />;
    case 'aurora':
      return <Aurora frame={frame} accent={accent} />;
    case 'glow-orbs':
      return <GlowOrbs frame={frame} dur={dur} accent={accent} u={u} />;
    default:
      return <></>;
  }
}
