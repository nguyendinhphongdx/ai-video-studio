import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { OUTLINE, Sky, outline, useLayout } from '../primitives';

export interface RecapSceneProps {
  heading: string;
  emojis: string;
  caption: string;
  color: string;
}

/** "Last time we learned...": a row of emoji from the previous episode, each ticked off in turn. */
export function RecapScene({ heading, emojis, caption, color }: RecapSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const items = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(emojis.replace(/\s+/g, ''))].map((s) => s.segment).slice(0, 5);
  const headIn = spring({ frame, fps, config: { damping: 10 } });
  const size = (items.length <= 3 ? 230 : 170) * u * (portrait ? 0.8 : 1);
  const labelIn = spring({ frame: frame - 20 - items.length * 10, fps, config: { damping: 12 } });
  return (
    <Sky color={color}>
      <AbsoluteFill style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 50 * u, padding: `${60 * u}px ${80 * u}px` }}>
        <div
          style={{
            fontSize: 110 * u,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.05,
            textShadow: outline(OUTLINE, 9 * u),
            transform: `scale(${headIn}) rotate(${Math.sin(frame / 9) * 2}deg)`,
          }}
        >
          {heading}
        </div>
        <div style={{ display: 'flex', gap: 36 * u, flexWrap: 'wrap', justifyContent: 'center' }}>
          {items.map((e, i) => {
            const pop = spring({ frame: frame - 12 - i * 10, fps, config: { damping: 6 } });
            const tick = spring({ frame: frame - 24 - i * 10, fps, config: { damping: 8 } });
            return (
              <div key={i} style={{ position: 'relative', fontSize: size, lineHeight: 1.1, transform: `scale(${pop})` }}>
                {e}
                <div style={{ position: 'absolute', right: -size * 0.12, bottom: -size * 0.05, fontSize: size * 0.42, transform: `scale(${tick})` }}>✅</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 80 * u,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            textShadow: outline(OUTLINE, 5 * u),
            opacity: labelIn,
            transform: `translateY(${interpolate(labelIn, [0, 1], [50, 0])}px)`,
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
    </Sky>
  );
}
