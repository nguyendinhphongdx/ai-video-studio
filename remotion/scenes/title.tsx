import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { Board, BrandLogo, Sky, Written, outline, progress, useLayout } from '../primitives';

export interface TitleSceneProps {
  title: string;
  look: 'sky' | 'board';
}

const WORD_COLORS = ['#FF4F6D', '#FFB020', '#3CC86A', '#7B61FF', '#00B8D9'];

export function TitleScene({ title, look }: TitleSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();

  if (look === 'board') {
    const size = Math.min(portrait ? 130 : 190, (portrait ? 1900 : 3200) / Math.max(8, [...title].length)) * u;
    return (
      <Board>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 50 * u }}>
          <Written text={title} p={progress(frame, 5, 55)} size={size} />
          <svg width={900 * u} height={40 * u} viewBox="0 0 900 40">
            <path d="M 10 25 Q 450 40 890 18" fill="none" stroke="#FFB020" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress(frame, 55, 75)} />
          </svg>
        </AbsoluteFill>
        <BrandLogo size={150 * u} radius={20 * u} style={{ position: 'absolute', right: 30 * u, bottom: 30 * u }} />
      </Board>
    );
  }

  const pop = spring({ frame, fps, config: { damping: 9 } });
  return (
    <Sky>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 * u, padding: 60 * u }}>
        <BrandLogo
          size={520 * u}
          radius={50 * u}
          style={{ transform: `scale(${pop}) rotate(${Math.sin(frame / 8) * 2}deg)`, boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${30 * u}px` }}>
          {title.split(' ').map((w, i) => {
            const s = spring({ frame: frame - 15 - i * 5, fps, config: { damping: 8 } });
            return (
              <div
                key={i}
                style={{
                  fontSize: 130 * u,
                  fontWeight: 800,
                  color: WORD_COLORS[i % WORD_COLORS.length],
                  textShadow: outline('white', 7 * u),
                  transform: `scale(${s}) translateY(${Math.sin((frame - i * 6) / 6) * 8}px)`,
                }}
              >
                {w}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Sky>
  );
}
