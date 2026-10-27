// How a scene comes in. Scenes are rendered as separate clips, so a transition here is the incoming scene's own
// opening (a cover that is pulled away, a mask that grows, a flip), not a blend with the scene before; the outgoing scene
// fades to black over its last frames. Seventeen entrances; the ideas (bottom push, barn doors, blinds, glitch tear,
// ink bleed, light leak, card flip, mosaic, iris...) come from the transition shots of video-shotcraft (Apache-2.0),
// see NOTICE. Every one is a pure function of the frame number.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ReactNode } from 'react';

import { mulberry32 } from '../camera/noise';

import { ENTRANCE_META, type EntranceId } from './entrance-meta';

export const ENTRANCES = ENTRANCE_META.map((m) => m.id);
export type Entrance = EntranceId;

/** Which way a scene comes in: the one the scene names (`transition` prop), else a function of the block and its order. A function of the block and its order, so the preview and the render agree and neighbours differ. */
export function entranceFor(block: string, ordinal: number, chosen?: unknown): Entrance {
  if (typeof chosen === 'string' && (ENTRANCES as string[]).includes(chosen)) return chosen as Entrance;
  let h = 0;
  for (let i = 0; i < block.length; i++) h = (h * 31 + block.charCodeAt(i)) >>> 0;
  return ENTRANCES[(h + Math.max(1, ordinal) * 5) % ENTRANCES.length]!;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Progress 0..1 of the opening over `len` frames. */
const prog = (frame: number, len: number, e: (t: number) => number = ease) => e(interpolate(frame, [0, len], [0, 1], clamp));

export function SceneFade({ children, entrance = 'fade', colors = ['#0B0F19', '#F59E0B'] }: { children: ReactNode; entrance?: Entrance; colors?: string[] }) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const dark = colors[0] ?? '#0B0F19';
  const accent = colors[1] ?? '#F59E0B';
  const wrap = (style: React.CSSProperties, extra?: ReactNode) => (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {extra}
    </AbsoluteFill>
  );

  switch (entrance) {
    case 'flash': {
      const bloom = interpolate(frame, [0, 3, 12], [0, 0.85, 0], clamp);
      return wrap({}, <AbsoluteFill style={{ opacity: bloom, background: 'radial-gradient(ellipse at 50% 45%, rgba(255,248,235,0.98), rgba(255,244,224,0.55) 55%, transparent 85%)', pointerEvents: 'none' }} />);
    }
    case 'whip': {
      const t = prog(frame, 10);
      return wrap({ opacity: interpolate(t, [0, 0.4, 1], [0.35, 1, 1]), transform: `translateX(${(1 - t) * 7}%)`, filter: t < 1 ? `blur(${(1 - t) * 14}px)` : undefined });
    }
    case 'wipe': {
      const t = prog(frame, 11);
      return wrap({ clipPath: t < 1 ? `inset(0 ${(1 - t) * 100}% 0 0)` : undefined });
    }
    case 'iris': {
      const t = prog(frame, 12);
      return wrap({ clipPath: t < 1 ? `circle(${t * 78}% at 50% 50%)` : undefined });
    }
    case 'push-up': {
      // A solid panel covers the frame and is pushed up and out, taking the previous scene's place.
      const t = prog(frame, 15, inOut);
      return wrap({}, t < 1 ? <AbsoluteFill style={{ background: accent, transform: `translateY(${-t * 100}%)`, boxShadow: `0 ${40}px ${80}px rgba(0,0,0,0.35)` }} /> : null);
    }
    case 'barn-door': {
      const t = prog(frame, 16, inOut);
      return wrap({}, t < 1 ? (
        <>
          <AbsoluteFill style={{ background: dark, width: '50%', transform: `translateX(${-t * 100}%)` }} />
          <AbsoluteFill style={{ background: dark, left: '50%', width: '50%', transform: `translateX(${t * 100}%)` }} />
        </>
      ) : null);
    }
    case 'blinds': {
      const n = 12;
      const slat = height / n;
      return wrap({}, frame < 24 ? <>{Array.from({ length: n }, (_, i) => {
        const t = interpolate(frame, [i * 0.8, i * 0.8 + 12], [0, 1], clamp);
        return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * slat, height: slat + 1, background: dark, transform: `scaleY(${1 - ease(t)})`, transformOrigin: i % 2 ? 'top' : 'bottom' }} />;
      })}</> : null);
    }
    case 'glitch': {
      // The scene tears in: it shifts sideways in jittering bands while thin bars of colour flicker, and settles by frame 14.
      const r = mulberry32(frame * 131 + 7);
      const live = frame < 14;
      const amp = live ? (1 - frame / 14) * width * 0.05 : 0;
      return wrap(
        { transform: live ? `translateX(${(r() - 0.5) * 2 * amp}px)` : undefined, filter: live && frame % 3 === 0 ? 'hue-rotate(40deg) saturate(1.6)' : undefined, opacity: frame < 2 ? 0 : 1 },
        live ? <>{Array.from({ length: 7 }, (_, i) => { const y = r() * height; const h = (0.01 + r() * 0.05) * height; return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, height: h, background: i % 2 ? '#19d3ff' : '#ff2a55', opacity: 0.55 * (1 - frame / 14), mixBlendMode: 'screen' }} />; })}</> : null,
      );
    }
    case 'ink': {
      // Ink-like blobs grow from a few seeds and eat the dark, revealing the scene.
      const seeds = [[22, 40], [70, 30], [48, 74], [84, 78], [12, 82]] as const;
      const grow = prog(frame, 22, (t) => t);
      const layers = seeds.map(([x, y], i) => `radial-gradient(circle at ${x}% ${y}%, #000 ${Math.max(0, grow * 95 - i * 4)}%, transparent ${Math.max(0, grow * 95 - i * 4) + 6}%)`).join(', ');
      return wrap(grow < 1 ? { maskImage: layers, WebkitMaskImage: layers } : {});
    }
    case 'light-leak': {
      const t = prog(frame, 20, (x) => x);
      const peak = Math.sin(t * Math.PI);
      return wrap({ opacity: interpolate(t, [0, 0.45, 1], [0, 1, 1]) }, t < 1 ? <AbsoluteFill style={{ opacity: peak, mixBlendMode: 'screen', background: `radial-gradient(ellipse at ${-10 + t * 120}% 40%, rgba(255,190,110,0.95), rgba(255,110,150,0.55) 38%, transparent 70%)` }} /> : null);
    }
    case 'flip': {
      const t = prog(frame, 16, inOut);
      return (
        <AbsoluteFill style={{ opacity: out, perspective: `${width * 1.3}px`, background: dark }}>
          <AbsoluteFill style={{ transform: `rotateY(${(1 - t) * -90}deg)`, transformOrigin: '0% 50%', opacity: interpolate(t, [0, 0.15, 1], [0, 1, 1]) }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      );
    }
    case 'mosaic':
    case 'checker': {
      const cols = 10;
      const rows = 6;
      const r = mulberry32(99);
      const tiles = Array.from({ length: cols * rows }, (_, i) => {
        const cx = i % cols;
        const cy = Math.floor(i / cols);
        const delay = entrance === 'checker' ? ((cx + cy) % 2) * 7 + cx * 0.4 : r() * 12;
        return { cx, cy, gone: frame - delay >= 6 ? 1 : frame - delay <= 0 ? 0 : (frame - delay) / 6 };
      });
      return wrap({}, frame < 22 ? <>{tiles.map((tl, i) => tl.gone >= 1 ? null : <div key={i} style={{ position: 'absolute', left: (tl.cx * 100) / cols + '%', top: (tl.cy * 100) / rows + '%', width: 100 / cols + 0.2 + '%', height: 100 / rows + 0.2 + '%', background: dark, opacity: 1 - tl.gone }} />)}</> : null);
    }
    case 'radial-wipe': {
      const t = prog(frame, 16, inOut);
      const mask = `conic-gradient(from 0deg at 50% 50%, #000 ${t * 360}deg, transparent ${t * 360 + 1}deg)`;
      return wrap(t < 1 ? { maskImage: mask, WebkitMaskImage: mask } : {});
    }
    case 'diagonal-wipe': {
      const t = prog(frame, 14, inOut);
      const edge = t * 220 - 60;
      return wrap(t < 1 ? { clipPath: `polygon(0 0, ${Math.min(100, edge)}% 0, ${Math.min(100, edge - 40)}% 100%, 0 100%)` } : {});
    }
    case 'zoom-through': {
      const t = prog(frame, 13);
      return wrap({ transform: `scale(${1.5 - 0.5 * t})`, filter: t < 1 ? `blur(${(1 - t) * 22}px)` : undefined, opacity: interpolate(t, [0, 0.35, 1], [0, 1, 1]) });
    }
    default:
      return wrap({ opacity: interpolate(frame, [0, 8], [0, 1], clamp) });
  }
}
