// Shared pieces of the text shots. Each shot is a pure function of the frame number (seeded randomness, no Date or
// Math.random), so a render repeats exactly. The shots are new implementations of the typography recipes of
// video-shotcraft (Apache-2.0); see NOTICE.
import { Easing, interpolate } from 'remotion';

import { mulberry32 } from '../../camera/noise';

/** What a text shot is given. `items` are the lines a cycling shot rotates through (empty for entrance shots). */
export interface ShotInput {
  text: string;
  /** The text split into words, and which one carries the emphasis. */
  words: string[];
  hot: number;
  items: string[];
}

export interface ShotTheme {
  fg: string;
  accent: string;
  main: string;
  font: string;
  /** Scale: 1 = a 1080px short side. */
  u: number;
  portrait: boolean;
  /** Body size in px for this text length. */
  size: number;
  light: boolean;
}

export type ShotProps = ShotInput & { theme: ShotTheme };

export interface TextShot {
  id: string;
  /** Vietnamese name for the editor. */
  name: string;
  /** When to use it (for the AI and the editor). */
  hint: string;
  /** Needs `items` to rotate through. */
  items?: boolean;
  /** Drawn on light paper instead of the dark stage. */
  light?: boolean;
  Component: (p: ShotProps) => React.JSX.Element;
}

export const outQuint = Easing.bezier(0.22, 1, 0.36, 1);
export const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0..1 between two frames, clamped. */
export const ramp = (frame: number, a: number, b: number, easing: (t: number) => number = (t) => t): number => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/** Seeded random numbers for index i: the same i always gives the same values. */
export const randAt = (i: number, salt = 1): (() => number) => mulberry32(i * 2654435761 + salt * 97);

export const wordStyle = (t: ShotTheme, color?: string): React.CSSProperties => ({ fontFamily: t.font, fontWeight: 800, fontSize: t.size, lineHeight: 1.12, display: 'inline-block', color: color ?? t.fg, letterSpacing: -1 * t.u });

export function Row({ t, children, gap = 0.28 }: { t: ShotTheme; children: React.ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: t.size * gap, rowGap: t.size * 0.06, maxWidth: (t.portrait ? 960 : 1560) * t.u }}>{children}</div>;
}

/** The items a cycling shot should use: the given ones, else the emphasised word. */
export const itemsOf = (p: ShotInput): string[] => (p.items.length ? p.items : [p.words[p.hot] ?? p.text]);

/** The sentence without its last word, and that word: the "stem" a cycling shot keeps still. */
export const stemOf = (p: ShotInput): string => (p.items.length ? p.text : p.words.slice(0, -1).join(' '));
