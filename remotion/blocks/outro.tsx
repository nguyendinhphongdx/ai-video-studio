import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { Board, BrandLogo, INK, OUTLINE, Sky, outline, useBrand, useFont, useLayout } from '../primitives';

export interface OutroSceneProps {
  look: 'sky' | 'board';
}

/** Goodbye line + pulsing subscribe button, both from the channel settings. */
export function OutroScene({ look }: OutroSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const brand = useBrand();
  const board = look === 'board';
  const font = useFont();
  const logo = spring({ frame, fps, config: { damping: 10 } });
  const btn = spring({ frame: frame - 20, fps, config: { damping: 8 } });
  const Bg = board ? Board : Sky;
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 * u, fontFamily: font }}>
        <BrandLogo size={440 * u} radius={40 * u} style={{ transform: `scale(${logo})`, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }} />
        <div
          style={{
            fontSize: 84 * u,
            fontWeight: 800,
            textAlign: 'center',
            color: board ? INK : 'white',
            textShadow: board ? undefined : outline(OUTLINE, 6 * u),
            opacity: logo,
            padding: `0 ${60 * u}px`,
          }}
        >
          {brand.outroText}
        </div>
        <div
          style={{
            background: '#FF0033',
            color: 'white',
            fontSize: 60 * u,
            fontWeight: 800,
            padding: `${16 * u}px ${56 * u}px`,
            borderRadius: 999,
            transform: `scale(${btn * (1 + 0.06 * Math.sin(frame / 5))})`,
            boxShadow: `0 ${12 * u}px 0 #B00020`,
          }}
        >
          {brand.subscribeText}
        </div>
      </AbsoluteFill>
    </Bg>
  );
}
