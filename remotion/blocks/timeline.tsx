// A timeline the camera travels along: milestones on a ruler, the view sliding from one to the next, each card standing up
// as it is reached. The travel-and-stop grammar is adapted from the timeline-travel recipe of video-shotcraft (Apache-2.0),
// see NOTICE.
import type { EntranceId } from '../shots/entrance-meta';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { stageBackground, useBrand, useFont, useLayout } from '../primitives';

import { parseTimeline } from './data-parse';

export interface TimelineSceneProps {
  transition: 'auto' | EntranceId;
  title: string;
  data: string;
}

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function TimelineScene({ title, data }: TimelineSceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames: dur, width } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const items = parseTimeline(data);
  const n = Math.max(1, items.length);
  const gap = (portrait ? 760 : 620) * u;
  // Each milestone gets an equal share of the scene: it travels in during the first part and rests for the rest.
  const share = Math.max(24, (dur - 26) / n);
  const at = Math.max(0, frame - 10);
  const k = Math.min(n - 1, Math.floor(at / share));
  const local = at - k * share;
  const travel = Math.min(share * 0.45, 26);
  // The view stays on the first milestone, then slides to each next one in the opening part of its share.
  const camera = k === 0 ? 0 : k - 1 + inOut(Math.min(1, local / travel));
  const fade = interpolate(frame, [dur - 10, dur], [1, 0], { ...clamp });
  return (
    <AbsoluteFill style={{ background: stageBackground(main), fontFamily: font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, top: (portrait ? 150 : 100) * u, fontWeight: 800, fontSize: 54 * u * (portrait ? 0.8 : 1), color: 'white', opacity: interpolate(frame, [0, 12], [0, 1], { ...clamp }) }}>{title}</div>
      <div style={{ position: 'absolute', left: 0, top: '56%', width: gap * (n + 3), height: 6 * u, background: 'rgba(255,255,255,0.28)', transform: `translateX(${width / 2 - camera * gap - gap}px)` }}>
        {Array.from({ length: n * 6 + 6 }, (_, i) => <div key={i} style={{ position: 'absolute', left: (i * gap) / 6, top: i % 6 === 0 ? -16 * u : -7 * u, width: 3 * u, height: i % 6 === 0 ? 38 * u : 20 * u, background: 'rgba(255,255,255,0.35)' }} />)}
      </div>
      {items.map((it, i) => {
        const dist = Math.abs(i - camera);
        const focus = Math.max(0, 1 - dist);
        const up = i % 2 === 0;
        const x = width / 2 + (i - camera) * gap + 0;
        const shown = i <= k ? 1 : 0;
        const pop = i === k ? interpolate(local, [travel * 0.6, travel * 0.6 + 12], [0, 1], { ...clamp }) : i < k ? 1 : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: '56%', transform: `translate(-50%, 0)`, opacity: shown ? 0.35 + 0.65 * focus : 0.0, width: 0 }}>
            <div style={{ position: 'absolute', left: -9 * u, top: -9 * u, width: 24 * u, height: 24 * u, borderRadius: '50%', background: focus > 0.5 ? accent : 'rgba(255,255,255,0.7)', boxShadow: focus > 0.5 ? `0 0 ${24 * u}px ${accent}` : undefined, transform: `scale(${0.8 + 0.5 * focus * pop})` }} />
            <div style={{ position: 'absolute', left: -(portrait ? 300 : 260) * u, width: (portrait ? 600 : 520) * u, [up ? 'bottom' : 'top']: 44 * u, textAlign: 'center', transform: `translateY(${(1 - pop) * (up ? 40 : -40) * u}px) scale(${0.86 + 0.14 * focus})`, opacity: pop }}>
              <div style={{ fontWeight: 800, fontSize: 96 * u * (portrait ? 0.8 : 1), color: accent, lineHeight: 1 }}>{it.label}</div>
              <div style={{ marginTop: 12 * u, fontWeight: 700, fontSize: 40 * u * (portrait ? 0.85 : 1), color: 'white', lineHeight: 1.2 }}>{it.text}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, bottom: (portrait ? 170 : 70) * u, fontWeight: 700, fontSize: 28 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', opacity: fade }}>{brand.name}</div>
    </AbsoluteFill>
  );
}
