// A crowd of dots that gathers into a grid and lights up the share that matters ("3 in 10"). The three-act regroup is
// adapted from the unit-dot-swarm recipe of video-shotcraft (Apache-2.0), see NOTICE.
import type { EntranceId } from '../shots/entrance-meta';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { mulberry32 } from '../camera/noise';
import { stageBackground, useBrand, useFont, useLayout } from '../primitives';

import { parseNumber } from './data-parse';

export interface DotsSceneProps {
  transition: 'auto' | EntranceId;
  part: string;
  whole: string;
  caption: string;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** How many of up to 100 dots are lit for part out of whole. */
export function litDots(part: number, whole: number, total = 100): number {
  if (whole <= 0) return 0;
  return Math.min(total, Math.max(part > 0 ? 1 : 0, Math.round((part / whole) * total)));
}

export function DotsScene({ part, whole, caption }: DotsSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const p = parseNumber(part) ?? 0;
  const w = parseNumber(whole) ?? 100;
  const total = w <= 100 ? Math.max(1, Math.round(w)) : 100;
  const lit = w <= 100 ? Math.min(total, Math.round(p)) : litDots(p, w);
  const cols = total <= 10 ? total : total <= 40 ? 10 : 20;
  const rows = Math.ceil(total / cols);
  const cell = Math.min((portrait ? 860 : 1120) / cols, (portrait ? 760 : 520) / rows) * u;
  const rand = mulberry32(5);
  const gather = interpolate(frame, [6, 46], [0, 1], { ...clamp, easing: easeOut });
  const light = interpolate(frame, [52, 76], [0, 1], { ...clamp });
  const pct = Math.round((p / Math.max(1, w)) * 100);
  const fade = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { ...clamp });
  return (
    <AbsoluteFill style={{ background: stageBackground(main), fontFamily: font, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexDirection: portrait ? 'column' : 'row', gap: 80 * u }}>
      <div style={{ position: 'relative', width: cols * cell, height: rows * cell }}>
        {Array.from({ length: total }, (_, i) => {
          const gx = (i % cols) * cell + cell / 2;
          const gy = Math.floor(i / cols) * cell + cell / 2;
          const sx = (rand() - 0.5) * 1700 * u + (cols * cell) / 2;
          const sy = (rand() - 0.5) * 1000 * u + (rows * cell) / 2;
          const on = i < lit;
          const k = on ? light : 0;
          const r = cell * (0.34 + 0.12 * k);
          return <div key={i} style={{ position: 'absolute', left: sx + (gx - sx) * gather - r, top: sy + (gy - sy) * gather - r, width: r * 2, height: r * 2, borderRadius: '50%', background: on ? accent : 'rgba(255,255,255,0.42)', opacity: 0.35 + 0.65 * gather, transform: `scale(${on ? 1 + 0.22 * Math.sin(k * Math.PI) : 1})`, boxShadow: on && k > 0.5 ? `0 0 ${18 * u}px ${accent}99` : undefined }} />;
        })}
      </div>
      <div style={{ textAlign: portrait ? 'center' : 'left', opacity: light }}>
        <div style={{ fontWeight: 800, fontSize: 210 * u * (portrait ? 0.7 : 1), color: accent, lineHeight: 1, letterSpacing: -3 * u }}>{pct}%</div>
        {caption ? <div style={{ marginTop: 18 * u, fontWeight: 700, fontSize: 54 * u * (portrait ? 0.8 : 1), color: 'white', maxWidth: (portrait ? 900 : 560) * u, lineHeight: 1.2 }}>{caption}</div> : null}
      </div>
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, bottom: (portrait ? 170 : 70) * u, fontWeight: 700, fontSize: 28 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', opacity: fade }}>{brand.name}</div>
    </AbsoluteFill>
  );
}
