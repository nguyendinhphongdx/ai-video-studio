// Horizontal bars growing in, the biggest one picked out in the accent colour. Rows land faster and faster (the
// "speed comes from acceleration" rule of video-shotcraft's aesthetic notes, Apache-2.0, see NOTICE).
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { shade, stageBackground, useBrand, useFont, useLayout } from '../primitives';

import { parseChart } from './chart-data';

export interface ChartSceneProps {
  title: string;
  unit: string;
  data: string;
}

export function ChartScene({ title, unit, data }: ChartSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const items = parseChart(data);
  const max = Math.max(1, ...items.map((i) => i.value));
  const top = items.reduce((b, it, i) => (it.value > items[b]!.value ? i : b), 0);
  const fade = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  // Row i starts at 10 + 9i - i^2/2 frames: each row follows its neighbour a little sooner.
  const startOf = (i: number) => 14 + 11 * i - i * i * 0.6;
  const rowH = Math.min(120, 620 / Math.max(3, items.length)) * u;
  return (
    <AbsoluteFill style={{ background: stageBackground(main), fontFamily: font, overflow: 'hidden', padding: `${(portrait ? 170 : 90) * u}px ${(portrait ? 70 : 150) * u}px` }}>
      <div style={{ fontWeight: 800, fontSize: 70 * u * (portrait ? 0.8 : 1), color: 'white', marginBottom: 46 * u, opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: rowH * 0.28, flex: 1, justifyContent: 'center' }}>
        {items.map((it, i) => {
          const t = interpolate(frame, [startOf(i), startOf(i) + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
          const color = i === top ? accent : shade(main, 0.32);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28 * u, height: rowH, opacity: interpolate(t, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' }) }}>
              <div style={{ width: (portrait ? 260 : 360) * u, fontWeight: 700, fontSize: 44 * u * (portrait ? 0.8 : 1), color: 'white', textAlign: 'right' }}>{it.label}</div>
              <div style={{ flex: 1, height: rowH * 0.62, background: 'rgba(255,255,255,0.08)', borderRadius: 14 * u, overflow: 'hidden' }}>
                <div style={{ width: `${(it.value / max) * 100 * t}%`, height: '100%', background: color, borderRadius: 14 * u, boxShadow: i === top ? `0 0 ${40 * u}px ${accent}66` : undefined }} />
              </div>
              <div style={{ width: (portrait ? 200 : 260) * u, fontWeight: 800, fontSize: 52 * u * (portrait ? 0.8 : 1), color: i === top ? accent : 'white', fontVariantNumeric: 'tabular-nums' }}>
                {it.shown}
                {unit ? <span style={{ fontSize: 30 * u, fontWeight: 700, marginLeft: 8 * u, opacity: 0.8 }}>{unit}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: (portrait ? 70 : 150) * u, bottom: (portrait ? 170 : 60) * u, fontWeight: 700, fontSize: 28 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', opacity: fade }}>{brand.name}</div>
    </AbsoluteFill>
  );
}
