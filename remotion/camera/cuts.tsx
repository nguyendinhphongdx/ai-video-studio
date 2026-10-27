// A picture cut up and shown in rhythm: hard jumps in, flashes, comic panels, four at once, stepped motion. Everything
// is a crop of the same picture, so it needs no extra image. Pure functions of the frame number. The cutting grammars
// come from the rhythm shot recipes of video-shotcraft (Apache-2.0), see NOTICE.
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { useLayout } from '../primitives';
import type { CutId } from '../shots/cut-meta';

import { poseAt } from './moves';
import { randAt } from '../shots/text/common';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const span = (f: number, a: number, b: number, e: (t: number) => number = (t) => t) => e(interpolate(f, [a, b], [0, 1], clamp));

/** Two points of interest of the picture (in percent of its size), the same for the same seed. */
function focuses(seed: number): [{ x: number; y: number }, { x: number; y: number }] {
  const r = randAt(seed, 11);
  return [
    { x: 32 + r() * 36, y: 36 + r() * 28 },
    { x: 28 + r() * 44, y: 30 + r() * 40 },
  ];
}

/** The picture shown at `scale`, centred on the point (percent), inside whatever box contains it. */
function Crop({ src, scale, at, extra }: { src: string; scale: number; at: { x: number; y: number }; extra?: React.CSSProperties }) {
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${at.x}% ${at.y}%`, transform: `scale(${scale})`, ...extra }} />
    </AbsoluteFill>
  );
}

function JumpPunch({ src, seed }: { src: string; seed: number }) {
  const frame = useCurrentFrame();
  const [a, b] = focuses(seed);
  // Three hard jumps, 18 frames apart, with a slow creep once the last one lands.
  const step = frame < 18 ? 0 : frame < 36 ? 1 : 2;
  const scale = [1.05, 1.4, 1.95][step]! + (step === 2 ? span(frame, 36, 150) * 0.12 : 0);
  return <Crop src={src} scale={scale} at={step === 0 ? a : b} />;
}

function FlashFreeze({ src, seed }: { src: string; seed: number }) {
  const frame = useCurrentFrame();
  const [a, b] = focuses(seed);
  const cuts = [0, 14, 28];
  const k = frame < cuts[1]! ? 0 : frame < cuts[2]! ? 1 : 2;
  const scale = [1.04, 1.7, 2.5][k]!;
  const since = frame - cuts[k]!;
  // Each cut lands on a white flash that drains in a few frames; the last one settles slowly.
  const flash = k === 0 && frame < 2 ? 0 : interpolate(since, [0, 1, 5], [0.9, 0.9, 0], clamp);
  return (
    <>
      <Crop src={src} scale={scale + (k === 2 ? span(frame, 28, 140) * 0.1 : 0)} at={k === 1 ? a : b} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </>
  );
}

const PANELS = [
  { poly: 'polygon(0 0, 46% 0, 36% 100%, 0 100%)', crop: { scale: 1.1, x: 30, y: 50 }, at: 0 },
  { poly: 'polygon(48% 0, 100% 0, 100% 52%, 40% 52%)', crop: { scale: 1.9, x: 62, y: 38 }, at: 9 },
  { poly: 'polygon(38% 54%, 100% 54%, 100% 100%, 38% 100%)', crop: { scale: 2.7, x: 50, y: 62 }, at: 18 },
];

function ComicPanels({ src, seed }: { src: string; seed: number }) {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const [a, b] = focuses(seed);
  const grow = span(frame, 52, 74, (t) => t * t * (3 - 2 * t));
  return (
    <AbsoluteFill style={{ background: '#0b0906' }}>
      {PANELS.map((p, i) => {
        const pop = span(frame, p.at, p.at + 6, easeOut);
        const last = i === 2;
        const poly = last && grow > 0 ? `polygon(${38 - 38 * grow}% ${54 - 54 * grow}%, 100% ${54 - 54 * grow}%, 100% 100%, ${38 - 38 * grow}% 100%)` : p.poly;
        const at = i === 0 ? { x: 30, y: 50 } : i === 1 ? a : b;
        return (
          <AbsoluteFill key={i} style={{ clipPath: poly, opacity: pop > 0 ? 1 : 0, transform: `scale(${1 + (1 - pop) * 0.06})` }}>
            <Crop src={src} scale={p.crop.scale + (last ? grow * -0.5 : 0)} at={at} />
            <AbsoluteFill style={{ boxShadow: `inset 0 0 0 ${6 * u}px #0b0906` }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

function Quad({ src, seed }: { src: string; seed: number }) {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const [a, b] = focuses(seed);
  const cells = [
    { x: 0, y: 0, at: a, s: 1.5, d: [1, 0.5], start: 0 },
    { x: 50, y: 0, at: b, s: 2.1, d: [-0.6, 1], start: 4 },
    { x: 0, y: 50, at: { x: 50, y: 50 }, s: 1.15, d: [0.4, -0.8], start: 8 },
    { x: 50, y: 50, at: { x: 70 - a.x * 0.2, y: 40 }, s: 2.6, d: [-1, -0.4], start: 12 },
  ];
  return (
    <AbsoluteFill style={{ background: '#0b0906' }}>
      {cells.map((c, i) => {
        const on = frame >= c.start;
        const k = Math.max(0, frame - c.start);
        return (
          <div key={i} style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: '50%', height: '50%', overflow: 'hidden', opacity: on ? 1 : 0, boxShadow: `inset 0 0 0 ${5 * u}px #0b0906` }}>
            <Crop src={src} scale={c.s + k * 0.003} at={{ x: c.at.x + c.d[0]! * k * 0.05, y: c.at.y + c.d[1]! * k * 0.05 }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Stepped motion (a new position every third frame) until the climax, then the same move smooth and fast. */
function Sakuga({ src, seed }: { src: string; seed: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const climax = Math.round(Math.max(60, durationInFrames * 0.55));
  const smooth = frame >= climax;
  const stepped = smooth ? frame : Math.floor(frame / 3) * 3;
  const t = Math.min(1, stepped / Math.max(1, durationInFrames));
  const p = poseAt(seed % 2 ? 'pan-left' : 'zoom-in', t, 0);
  const rush = smooth ? span(frame, climax, climax + 20, easeOut) : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${p.x * (1 + rush * 2.2)}%, ${p.y}%) scale(${p.scale + rush * 0.35})` }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  );
}

export function CutStage({ kind, src, seed = 1 }: { kind: Exclude<CutId, 'none'>; src: string; seed?: number }) {
  switch (kind) {
    case 'jump-punch':
      return <JumpPunch src={src} seed={seed} />;
    case 'flash-freeze':
      return <FlashFreeze src={src} seed={seed} />;
    case 'comic-panels':
      return <ComicPanels src={src} seed={seed} />;
    case 'quad':
      return <Quad src={src} seed={seed} />;
    case 'sakuga':
      return <Sakuga src={src} seed={seed} />;
  }
}
