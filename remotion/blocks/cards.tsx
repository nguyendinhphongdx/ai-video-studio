import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { OUTLINE, Sky, emojiSize, headingSize, outline, shade, useLayout } from '../primitives';

import { cardsLayoutFor, skyPatternFor } from './variants';

export interface CardsSceneProps {
  heading: string;
  emoji: string;
  count: number;
  caption: string;
  color: string;
}

/**
 * Four layouts with their own entrances (and a different background pattern each), picked from the scene's ordinal
 * so a video of many card scenes never repeats the same composition twice in a row.
 */
export function CardsScene({ heading, emoji, count, caption, color, ordinal = 1 }: CardsSceneProps & { ordinal?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const n = Math.min(10, Math.max(1, Math.round(count)));
  const layout = cardsLayoutFor(ordinal);
  const eSize = emojiSize(n) * u * (portrait ? 1.1 : 1);
  const pop = spring({ frame, fps, config: { damping: 7 } });
  const slide = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const labelIn = spring({ frame: frame - 15 - n * 8, fps, config: { damping: 12 } });

  const emojis = (dir: 'rise' | 'drop' | 'side') => (
    <div style={{ display: 'flex', gap: 20 * u, flexWrap: 'wrap', justifyContent: 'center', maxWidth: (portrait ? 900 : 1100) * u }}>
      {Array.from({ length: n }).map((_, i) => {
        const s = spring({ frame: frame - 10 - i * 8, fps, config: { damping: dir === 'drop' ? 5 : 6 } });
        const from = dir === 'drop' ? -500 : dir === 'rise' ? 400 : i % 2 ? 500 : -500;
        const t = dir === 'side' ? `translateX(${interpolate(s, [0, 1], [from * u, 0])}px)` : `translateY(${interpolate(s, [0, 1], [from * u, 0])}px)`;
        return (
          <div key={i} style={{ fontSize: eSize, lineHeight: 1.1, transform: `${t} scale(${0.4 + 0.6 * s}) translateY(${Math.abs(Math.sin((frame - i * 5) / 6)) * -16 * u}px)` }}>
            {emoji}
          </div>
        );
      })}
    </div>
  );
  const headingEl = (size: number, extra?: React.CSSProperties) => (
    <div style={{ textAlign: 'center', fontSize: size, fontWeight: 800, lineHeight: 1.05, color: 'white', textShadow: outline(OUTLINE, 12 * u), ...extra }}>{heading}</div>
  );
  const captionEl = (extra?: React.CSSProperties) => (
    <div style={{ fontSize: 88 * u, fontWeight: 800, color: 'white', textAlign: 'center', textShadow: outline(OUTLINE, 6 * u), opacity: labelIn, transform: `translateY(${interpolate(labelIn, [0, 1], [60, 0])}px)`, ...extra }}>{caption}</div>
  );
  const pad = { padding: `${80 * u}px ${100 * u}px` };

  let body: React.ReactNode;
  if (layout === 'stack') {
    body = (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 36 * u, ...pad }}>
        {headingEl(headingSize(heading) * u * 0.62, { transform: `translateY(${interpolate(slide, [0, 1], [-400 * u, 0])}px)` })}
        {emojis('rise')}
        <div style={{ background: 'white', borderRadius: 999, padding: `${12 * u}px ${54 * u}px`, boxShadow: `0 ${10 * u}px 0 ${shade(color, -0.3)}`, opacity: labelIn, transform: `scale(${labelIn})` }}>
          <div style={{ fontSize: 76 * u, fontWeight: 800, color: shade(color, -0.25) }}>{caption}</div>
        </div>
      </AbsoluteFill>
    );
  } else if (layout === 'mirror') {
    body = (
      <AbsoluteFill style={{ flexDirection: portrait ? 'column-reverse' : 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 50 * u, ...pad }}>
        <div style={{ minWidth: portrait ? undefined : 560 * u, transform: `translateX(${interpolate(slide, [0, 1], [700 * u, 0])}px)`, display: 'flex', flexDirection: 'column', gap: 30 * u, alignItems: 'center' }}>
          {headingEl(headingSize(heading) * u * 0.8)}
          {captionEl({ fontSize: 70 * u })}
        </div>
        <div style={{ flex: portrait ? undefined : 1, display: 'flex', justifyContent: 'center' }}>{emojis('side')}</div>
      </AbsoluteFill>
    );
  } else if (layout === 'badge') {
    body = (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 * u, ...pad }}>
        <div style={{ width: 520 * u, height: 520 * u, borderRadius: '50%', background: 'white', border: `${16 * u}px solid ${shade(color, -0.3)}`, boxShadow: `0 ${24 * u}px 0 rgba(0,0,0,0.18)`, display: 'grid', placeItems: 'center', transform: `scale(${pop}) rotate(${interpolate(pop, [0, 1], [-25, 0])}deg)` }}>
          <div style={{ fontSize: Math.min(headingSize(heading), 300) * u * 0.9, fontWeight: 800, color: shade(color, -0.2), lineHeight: 1 }}>{heading}</div>
        </div>
        {emojis('drop')}
        {captionEl()}
      </AbsoluteFill>
    );
  } else {
    body = (
      <AbsoluteFill style={{ flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 40 * u, ...pad }}>
        <div style={{ minWidth: portrait ? undefined : 560 * u }}>{headingEl(headingSize(heading) * u, { transform: `scale(${pop}) rotate(${Math.sin(frame / 7) * 4}deg)` })}</div>
        <div style={{ flex: portrait ? undefined : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 * u }}>
          {emojis('rise')}
          {captionEl({ fontSize: 96 * u })}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <Sky color={color} pattern={skyPatternFor(ordinal)}>
      {body}
    </Sky>
  );
}
