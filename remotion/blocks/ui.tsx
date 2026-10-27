// A scene that plays out inside a software window: cards fly in, a cursor clicks, a filter narrows. The looks are in
// shots/ui; the content slots are generic (title, items, target) so any product or topic fits.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { stageBackground, useBrand, useFont, useLayout } from '../primitives';
import type { EntranceId } from '../shots/entrance-meta';
import { UI_LOOKS } from '../shots/ui/looks';
import type { UiLookId } from '../shots/ui/meta';

import { uiItems, uiTarget } from './ui-data';
import { uiLookFor } from './variants';

export interface UiSceneProps {
  title: string;
  items: string;
  target: string;
  look: 'auto' | UiLookId;
  transition: 'auto' | EntranceId;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function UiScene({ title, items, target, look, ordinal = 1 }: UiSceneProps & { ordinal?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const list = uiItems(items);
  const safe = list.length >= 2 ? list : ['Mục một', 'Mục hai', 'Mục ba'];
  const id: UiLookId = look === 'auto' || !UI_LOOKS[look] ? (uiLookFor(ordinal) as UiLookId) : look;
  const w = (portrait ? 940 : 1500) * u;
  const h = (portrait ? 1240 : 800) * u;
  const bar = 70 * u;
  const intro = interpolate(frame, [0, 16], [0, 1], { ...clamp });
  const drift = interpolate(frame, [0, durationInFrames], [1.0, 1.035], clamp);
  return (
    <AbsoluteFill style={{ background: stageBackground(main), fontFamily: font, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: w, height: h, borderRadius: 30 * u, background: 'rgba(12,16,30,0.82)', border: `${2 * u}px solid rgba(255,255,255,0.18)`, boxShadow: `0 ${40 * u}px ${110 * u}px rgba(0,0,0,0.55)`, overflow: 'hidden', opacity: intro, transform: `scale(${(0.94 + 0.06 * intro) * drift})`, position: 'relative' }}>
        <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: 12 * u, padding: `0 ${26 * u}px`, background: 'rgba(255,255,255,0.06)', borderBottom: `${2 * u}px solid rgba(255,255,255,0.1)` }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <span key={c} style={{ width: 18 * u, height: 18 * u, borderRadius: '50%', background: c }} />
          ))}
          <span style={{ marginLeft: 16 * u, color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 26 * u }}>{brand.name}</span>
        </div>
        <div style={{ position: 'absolute', left: 0, top: bar, width: w, height: h - bar }}>{UI_LOOKS[id]({ frame, u, w, h: h - bar, portrait, main, accent, title, items: safe, target: uiTarget(target, safe) })}</div>
      </div>
    </AbsoluteFill>
  );
}
