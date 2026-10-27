// A big number rolling up to its value, with a unit and a caption. The odometer roll is adapted from video-shotcraft's
// DigitRoll (Apache-2.0), see NOTICE.
import type { EntranceId } from '../shots/entrance-meta';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { stageBackground, useBrand, useFont, useLayout } from '../primitives';

export interface CounterSceneProps {
  transition: 'auto' | EntranceId;
  value: string;
  unit: string;
  caption: string;
}

const DIGITS = '0123456789';

function Roll({ value, fontSize, color, delay = 4 }: { value: string; fontSize: number; color: string; delay?: number }) {
  const frame = useCurrentFrame();
  const lineH = fontSize * 1.12;
  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
      {value.split('').map((ch, i) => {
        const target = DIGITS.indexOf(ch);
        if (target < 0) return <span key={i} style={{ fontSize, lineHeight: `${lineH}px`, color }}>{ch}</span>;
        // Later digits start later and roll through one extra strip before landing, so the number settles left to right.
        const t = interpolate(frame, [delay + i * 4, delay + i * 4 + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
        const offset = (10 + target) * t * lineH;
        return (
          <span key={i} style={{ display: 'inline-block', height: lineH }}>
            <span style={{ display: 'block', transform: `translateY(${-offset}px)` }}>
              {(DIGITS + DIGITS).split('').map((d, j) => (
                <span key={j} style={{ display: 'block', fontSize, lineHeight: `${lineH}px`, color, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function CounterScene({ value, unit, caption }: CounterSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const shown = value.trim() || '0';
  const size = Math.min(330, Math.max(150, 1250 / Math.max(3, shown.length))) * u * (portrait ? 0.74 : 1);
  const settle = 4 + shown.length * 4 + 26;
  const pop = interpolate(frame, [settle, settle + 6, settle + 16], [1, 1.05, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rest = interpolate(frame, [settle - 6, settle + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: stageBackground(main), justifyContent: 'center', alignItems: 'center', fontFamily: font, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.12, transform: `scale(${pop})` }}>
        <span style={{ fontFamily: font, fontWeight: 800, letterSpacing: -2 * u }}>
          <Roll value={shown} fontSize={size} color={accent} />
        </span>
        {unit ? <span style={{ fontWeight: 800, fontSize: size * 0.38, color: 'white', opacity: rest }}>{unit}</span> : null}
      </div>
      {caption ? <div style={{ marginTop: 36 * u, fontWeight: 700, fontSize: 56 * u * (portrait ? 0.8 : 1), color: 'white', textAlign: 'center', maxWidth: (portrait ? 900 : 1500) * u, opacity: rest, transform: `translateY(${interpolate(rest, [0, 1], [24 * u, 0])}px)` }}>{caption}</div> : null}
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, bottom: (portrait ? 170 : 90) * u, fontWeight: 700, fontSize: 30 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', opacity: fade }}>{brand.name}</div>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
    </AbsoluteFill>
  );
}
