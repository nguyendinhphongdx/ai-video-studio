import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { OUTLINE, Sky, outline, shade, useLayout } from '../primitives';

export interface QuizSceneProps {
  question: string;
  emoji: string;
  optionA: string;
  optionB: string;
  optionC: string;
  answer: 'A' | 'B' | 'C';
  color: string;
}

const LETTERS = ['A', 'B', 'C'] as const;

/** A question with three options; the right one lights up near the end of the scene. */
export function QuizScene({ question, emoji, optionA, optionB, optionC, answer, color }: QuizSceneProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const options = [optionA, optionB, optionC];
  const revealAt = Math.round(durationInFrames * 0.62);
  const revealed = frame >= revealAt;
  const qIn = spring({ frame, fps, config: { damping: 10 } });
  return (
    <Sky color={color}>
      <AbsoluteFill style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44 * u, padding: `${50 * u}px ${70 * u}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 * u, transform: `scale(${qIn})` }}>
          <div style={{ fontSize: 190 * u, lineHeight: 1, transform: `translateY(${Math.sin(frame / 7) * -10 * u}px)` }}>{emoji}</div>
          <div style={{ maxWidth: (portrait ? 760 : 1200) * u, fontSize: (question.length > 28 ? 84 : 110) * u, fontWeight: 800, lineHeight: 1.08, color: 'white', textShadow: outline(OUTLINE, 8 * u) }}>{question}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 34 * u, width: '100%', justifyContent: 'center' }}>
          {options.map((text, i) => {
            const letter = LETTERS[i]!;
            const pop = spring({ frame: frame - 14 - i * 8, fps, config: { damping: 9 } });
            const right = letter === answer;
            const dim = revealed && !right;
            return (
              <div
                key={letter}
                style={{
                  flex: portrait ? undefined : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22 * u,
                  padding: `${26 * u}px ${30 * u}px`,
                  borderRadius: 36 * u,
                  background: revealed && right ? '#43D17A' : 'white',
                  border: `${8 * u}px solid ${revealed && right ? '#1F9D55' : shade(color, -0.25)}`,
                  opacity: dim ? 0.45 : 1,
                  transform: `scale(${pop * (revealed && right ? 1.06 : 1)})`,
                  boxShadow: '0 14px 30px rgba(0,0,0,0.22)',
                }}
              >
                <div style={{ flex: 'none', width: 84 * u, height: 84 * u, borderRadius: '50%', background: shade(color, -0.2), color: 'white', fontSize: 54 * u, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{letter}</div>
                <div style={{ fontSize: 66 * u, fontWeight: 800, lineHeight: 1.05, color: '#23325A' }}>{text}</div>
                {revealed && right ? <div style={{ marginLeft: 'auto', fontSize: 70 * u }}>✅</div> : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Sky>
  );
}
