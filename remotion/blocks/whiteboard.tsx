import { AbsoluteFill, useCurrentFrame } from 'remotion';

import { Board, BrandLogo, HAND, INK, Pen, Written, emojiSize, headingSize, progress, useLayout } from '../primitives';

export interface WhiteboardSceneProps {
  heading: string;
  emoji: string;
  count: number;
  caption: string;
  color: string;
}

/** Hand-drawn explainer step: numbered heading, a circle-wiped drawing, a handwritten caption. */
export function WhiteboardScene({ heading, emoji, count, caption, color, step }: WhiteboardSceneProps & { step: number }) {
  const frame = useCurrentFrame();
  const { u, portrait } = useLayout();
  const n = Math.min(10, Math.max(1, Math.round(count)));
  const drawP = progress(frame, 18, 60);
  const eSize = emojiSize(n) * u * 1.4;
  const r = 0.5 + drawP * 75;
  const angle = drawP * Math.PI * 4;
  const hSize = Math.min(headingSize(heading), 230) * u;
  return (
    <Board>
      <AbsoluteFill style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: (portrait ? 70 : 30) * u, padding: 60 * u }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 * u }}>
          <div
            style={{
              fontFamily: HAND,
              fontSize: 70 * u,
              color: '#fff',
              background: color,
              borderRadius: 999,
              width: 110 * u,
              height: 110 * u,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: progress(frame, 0, 8),
            }}
          >
            {step}
          </div>
          <Written text={heading} p={progress(frame, 0, 18)} size={hSize} color={color} />
        </div>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: -30 * u,
              border: `${6 * u}px solid ${INK}`,
              borderRadius: '48% 52% 45% 55%',
              clipPath: `inset(0 ${100 - drawP * 100}% 0 0)`,
            }}
          />
          <div style={{ display: 'flex', gap: 20 * u, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100 * u, padding: 20 * u, clipPath: `circle(${r}% at 50% 50%)` }}>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} style={{ fontSize: eSize, lineHeight: 1.1, transform: `rotate(${Math.sin(frame / 12 + i) * 3}deg)` }}>
                {emoji}
              </div>
            ))}
          </div>
          {drawP > 0 && drawP < 1 ? (
            <div style={{ position: 'absolute', left: `${50 + Math.cos(angle) * 35 * drawP}%`, top: `${50 + Math.sin(angle) * 35 * drawP}%` }}>
              <Pen size={200 * u} />
            </div>
          ) : null}
        </div>
        <Written text={caption} p={progress(frame, 62, 62 + Math.max(15, [...caption].length * 1.2))} size={(portrait ? 84 : 104) * u} />
      </AbsoluteFill>
      <BrandLogo size={130 * u} radius={18 * u} style={{ position: 'absolute', right: 30 * u, bottom: 30 * u, opacity: 0.9 }} />
    </Board>
  );
}
