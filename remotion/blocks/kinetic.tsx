// Kinetic text: a short statement set in motion. The shots (remotion/shots/text) come in two kinds: entrances that
// bring one phrase in, and cycles that rotate through lines. The recipes they are based on are the typography shots
// of video-shotcraft (Apache-2.0), see NOTICE.
import type { EntranceId } from '../shots/entrance-meta';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { stageBackground, useBrand, useFont, useLayout } from '../primitives';
import { TEXT_SHOT_BY_ID } from '../shots/text';
import type { TextShotId } from '../shots/text/meta';

import { kineticLookFor } from './variants';

export interface KineticSceneProps {
  transition: 'auto' | EntranceId;
  text: string;
  emphasis: string;
  /** Lines for the shots that rotate through them (one per line). */
  items: string;
  look: 'auto' | TextShotId;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Which word carries the emphasis: the one named, else the longest. */
export function emphasisIndex(words: string[], emphasis: string): number {
  const named = emphasis.trim() ? words.findIndex((w) => norm(w) === norm(emphasis)) : -1;
  if (named >= 0) return named;
  return words.reduce((best, w, i) => (norm(w).length > norm(words[best]!).length ? i : best), 0);
}

export function KineticScene({ text, emphasis, items, look, ordinal = 1 }: KineticSceneProps & { ordinal?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const lines = (items ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const wanted = look === 'auto' || !look ? kineticLookFor(ordinal, lines.length > 0) : look;
  const shot = TEXT_SHOT_BY_ID[wanted] ?? TEXT_SHOT_BY_ID.rise!;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const hot = emphasisIndex(words, emphasis);
  const chars = text.length;
  const size = (chars <= 24 ? 150 : chars <= 44 ? 120 : chars <= 64 ? 96 : 78) * u * (portrait ? 0.78 : 1);
  const light = Boolean(shot.light);
  const theme = { fg: light ? '#2A2418' : '#FFFFFF', accent, main, font, u, portrait, size, light };
  const rule = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fade = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: light ? 'radial-gradient(ellipse at 50% 40%, #F7F0DE, #E5DABC 85%)' : stageBackground(main), justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, top: (portrait ? 150 : 110) * u, width: 220 * u * rule, height: 8 * u, background: accent, borderRadius: 8 * u }} />
      <shot.Component text={text} words={words} hot={hot} items={lines} theme={theme} />
      <div style={{ position: 'absolute', left: (portrait ? 70 : 140) * u, bottom: (portrait ? 170 : 90) * u, fontFamily: font, fontWeight: 700, fontSize: 30 * u, letterSpacing: 6 * u, textTransform: 'uppercase', color: light ? 'rgba(42,36,24,0.55)' : 'rgba(255,255,255,0.55)', opacity: fade }}>{brand.name}</div>
      <AbsoluteFill style={{ background: light ? 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(60,40,10,0.22) 100%)' : 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
    </AbsoluteFill>
  );
}
