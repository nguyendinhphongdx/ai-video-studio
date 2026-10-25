import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { OUTLINE, Sky, emojiSize, headingSize, outline, useLayout } from '../primitives';

export interface CardsSceneProps {
  heading: string;
  emoji: string;
  count: number;
  caption: string;
  color: string;
}

export function CardsScene({ heading, emoji, count, caption, color }: CardsSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const n = Math.min(10, Math.max(1, Math.round(count)));
  const numPop = spring({ frame, fps, config: { damping: 7 } });
  const labelIn = spring({ frame: frame - 15 - n * 8, fps, config: { damping: 12 } });
  const eSize = emojiSize(n) * u * (portrait ? 1.1 : 1);
  return (
    <Sky color={color}>
      <AbsoluteFill
        style={{
          flexDirection: portrait ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${80 * u}px ${100 * u}px`,
          gap: 40 * u,
        }}
      >
        <div
          style={{
            minWidth: portrait ? undefined : 560 * u,
            textAlign: 'center',
            fontSize: headingSize(heading) * u,
            fontWeight: 800,
            lineHeight: 1.05,
            color: 'white',
            textShadow: outline(OUTLINE, 12 * u),
            transform: `scale(${numPop}) rotate(${Math.sin(frame / 7) * 4}deg)`,
          }}
        >
          {heading}
        </div>
        <div style={{ flex: portrait ? undefined : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 * u }}>
          <div style={{ display: 'flex', gap: 20 * u, flexWrap: 'wrap', justifyContent: 'center', maxWidth: (portrait ? 900 : 1100) * u }}>
            {Array.from({ length: n }).map((_, i) => {
              const s = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 6 } });
              return (
                <div key={i} style={{ fontSize: eSize, lineHeight: 1.1, transform: `scale(${s}) translateY(${Math.abs(Math.sin((frame - i * 5) / 6)) * -18 * u}px)` }}>
                  {emoji}
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 96 * u,
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              textShadow: outline(OUTLINE, 6 * u),
              opacity: labelIn,
              transform: `translateY(${interpolate(labelIn, [0, 1], [60, 0])}px)`,
            }}
          >
            {caption}
          </div>
        </div>
      </AbsoluteFill>
    </Sky>
  );
}
