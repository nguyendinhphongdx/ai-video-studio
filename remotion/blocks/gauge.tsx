// A dial whose needle is thrown to the end of the scale and back, then settles on the value, with a digital readout that
// counts with it (the "self-test sweep" of video-shotcraft's gauge recipes, Apache-2.0; see NOTICE).
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { stageBackground, useBrand, useFont, useLayout } from '../primitives';

import { parseNumber } from './data-parse';

export interface GaugeSceneProps {
  value: string;
  min: string;
  max: string;
  unit: string;
  caption: string;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0..1 position of the needle: up to full scale, back down past the value, and a damped settle on it. */
export function needleAt(frame: number, target: number): number {
  const up = interpolate(frame, [6, 30], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  if (frame < 30) return up;
  const down = interpolate(frame, [30, 56], [1, target], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
  const settle = frame > 56 ? Math.exp(-(frame - 56) / 7) * Math.sin((frame - 56) * 0.9) * 0.035 : 0;
  return Math.min(1, Math.max(0, down + settle));
}

export function GaugeScene({ value, min, max, unit, caption }: GaugeSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const lo = parseNumber(min) ?? 0;
  const hi = Math.max(lo + 1, parseNumber(max) ?? 100);
  const val = Math.min(hi, Math.max(lo, parseNumber(value) ?? lo));
  const target = (val - lo) / (hi - lo);
  const pos = needleAt(frame, target);
  const shown = lo + pos * (hi - lo);
  const R = (portrait ? 330 : 420) * u;
  const cx = R + 30 * u;
  const cy = R + 30 * u;
  const angle = -180 + pos * 180;
  const rad = (a: number) => (a * Math.PI) / 180;
  const pt = (a: number, r: number) => [cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r];
  const arc = (a0: number, a1: number, r: number) => {
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const fade = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { ...clamp });
  const decimals = hi - lo <= 10 && Number.isInteger(lo) === false ? 1 : /[.,]\d/.test(value) ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: stageBackground(main), fontFamily: font, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <svg width={2 * cx} height={cy + 50 * u} style={{ overflow: 'visible' }}>
        <path d={arc(-180, 0, R)} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={34 * u} strokeLinecap="round" />
        <path d={arc(-180, -180 + 180 * pos, R)} fill="none" stroke={accent} strokeWidth={34 * u} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${18 * u}px ${accent}88)` }} />
        {Array.from({ length: 11 }, (_, i) => {
          const a = -180 + i * 18;
          const [x0, y0] = pt(a, R - 34 * u);
          const [x1, y1] = pt(a, R - (i % 5 === 0 ? 78 : 58) * u);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(255,255,255,0.55)" strokeWidth={(i % 5 === 0 ? 5 : 3) * u} />;
        })}
        <g transform={`rotate(${angle + 180} ${cx} ${cy})`}>
          <path d={`M ${cx - R * 0.78} ${cy} L ${cx} ${cy - 9 * u} L ${cx} ${cy + 9 * u} Z`} fill="white" />
        </g>
        <circle cx={cx} cy={cy} r={20 * u} fill="white" />
        <circle cx={cx} cy={cy} r={8 * u} fill={main} />
      </svg>
      <div style={{ marginTop: 20 * u, display: 'flex', alignItems: 'baseline', gap: 14 * u }}>
        <span style={{ fontWeight: 800, fontSize: 190 * u * (portrait ? 0.8 : 1), color: accent, fontVariantNumeric: 'tabular-nums', letterSpacing: -3 * u }}>{shown.toFixed(decimals).replace('.', ',')}</span>
        {unit ? <span style={{ fontWeight: 800, fontSize: 70 * u, color: 'white' }}>{unit}</span> : null}
      </div>
      {caption ? <div style={{ marginTop: 14 * u, fontWeight: 700, fontSize: 52 * u * (portrait ? 0.8 : 1), color: 'white', textAlign: 'center', maxWidth: (portrait ? 900 : 1500) * u, opacity: interpolate(frame, [50, 66], [0, 1], { ...clamp }) }}>{caption}</div> : null}
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, bottom: (portrait ? 170 : 80) * u, fontWeight: 700, fontSize: 28 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', opacity: fade }}>{brand.name}</div>
    </AbsoluteFill>
  );
}
