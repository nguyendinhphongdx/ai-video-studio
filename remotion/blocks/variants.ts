// Scenes of the same block must not look identical. Variants are picked from the scene's ordinal
// (its position among scenes of that block), so the preview and the renderer always agree.

export type Motion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'drift-up' | 'drift-down';
export type LabelStyle = 'tape' | 'marker' | 'stamp' | 'typed';
export type Corner = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';
export type CardsLayout = 'split' | 'stack' | 'mirror' | 'badge';
export type SkyPattern = 'sparkles' | 'dots' | 'rays' | 'stripes';

const at = <T,>(list: readonly T[], ordinal: number): T => list[(((ordinal || 1) - 1) % list.length + list.length) % list.length]!;

const MOTION_CYCLE: Motion[] = ['zoom-in', 'pan-left', 'zoom-out', 'drift-up', 'pan-right', 'drift-down'];
export const autoMotion = (ordinal: number): Motion => at(MOTION_CYCLE, ordinal);

/** Label look and corner cycle with different periods, so their combinations keep changing. */
const LABEL_CYCLE: LabelStyle[] = ['tape', 'marker', 'stamp', 'typed'];
// Period 7 is coprime with the 4 label looks, so every look meets every corner over time.
const CORNER_CYCLE: Corner[] = ['bottom-right', 'top-left', 'bottom-left', 'top-right', 'bottom-left', 'top-left', 'top-right'];
export const labelStyleFor = (ordinal: number): LabelStyle => at(LABEL_CYCLE, ordinal);
export const cornerFor = (ordinal: number): Corner => at(CORNER_CYCLE, ordinal);

const LAYOUT_CYCLE: CardsLayout[] = ['split', 'stack', 'mirror', 'badge'];
export const cardsLayoutFor = (ordinal: number): CardsLayout => at(LAYOUT_CYCLE, ordinal);

const PATTERN_CYCLE: SkyPattern[] = ['sparkles', 'dots', 'rays', 'stripes', 'sparkles', 'rays'];
export const skyPatternFor = (ordinal: number): SkyPattern => at(PATTERN_CYCLE, ordinal);
