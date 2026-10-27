// Scenes of the same block must not look identical. Variants are picked from the scene's ordinal
// (its position among scenes of that block), so the preview and the renderer always agree.

import type { Motion } from '../camera/moves';

export type { Motion };
export type LabelStyle = 'tape' | 'marker' | 'stamp' | 'typed';
export type Corner = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';
export type CardsLayout = 'split' | 'stack' | 'mirror' | 'badge';
export type SkyPattern = 'sparkles' | 'dots' | 'rays' | 'stripes';

const at = <T,>(list: readonly T[], ordinal: number): T => list[(((ordinal || 1) - 1) % list.length + list.length) % list.length]!;

const MOTION_CYCLE: Motion[] = ['zoom-in', 'orbit-right', 'pan-left', 'tilt-glide', 'zoom-out', 'bullet-time', 'orbit-left', 'slide-parallax', 'pull-back', 'overhead', 'pan-right', 'handheld-push', 'drift-up', 'drone-dive', 'crash-zoom', 'drift-down', 'graze-slide', 'steep-slide'];
export const autoMotion = (ordinal: number): Motion => at(MOTION_CYCLE, ordinal);

/** Which scenes float the picture over a blurred copy with dust in front (period 5, so it does not line up with the 12 moves). */
const LAYER_CYCLE = [false, true, false, false, true];
export const layeredFor = (ordinal: number): boolean => at(LAYER_CYCLE, ordinal);

/** Label look and corner cycle with different periods, so their combinations keep changing. */
const LABEL_CYCLE: LabelStyle[] = ['tape', 'marker', 'stamp', 'typed'];
// Period 7 is coprime with the 4 label looks, so every look meets every corner over time.
const CORNER_CYCLE: Corner[] = ['bottom-right', 'top-left', 'bottom-left', 'top-right', 'bottom-left', 'top-left', 'top-right'];
export const labelStyleFor = (ordinal: number): LabelStyle => at(LABEL_CYCLE, ordinal);
export const cornerFor = (ordinal: number): Corner => at(CORNER_CYCLE, ordinal);

/** Entrances rotate through these (none needs extra lines); shots that rotate through lines take over when lines are given. */
const KINETIC_ENTRANCES = ['rise', 'zoom-assemble', 'blur-slide', 'split-stagger', 'outline-fill', 'letter-drift', 'typewriter', 'marker-underline', 'gradient-sweep', 'text-on-path', 'letter-drop', 'outline-ring', 'brace-expand', 'paper-stamp'];
const KINETIC_CYCLES = ['pill-slot', 'vertical-roll', 'relay-geometry', 'glitch-cycle', 'column-converge', 'pill-chip', 'relay-filmstrip', 'flying-words'];
export const kineticLookFor = (ordinal: number, hasItems = false): string => at(hasItems ? KINETIC_CYCLES : KINETIC_ENTRANCES, ordinal);

/** Overlay for a picture scene: most scenes stay clean, so an effect still means something when it appears. */
const FX_CYCLE = ['none', 'sheen', 'none', 'light-leak', 'none', 'spotlight', 'none', 'scan', 'ripple', 'none', 'aurora', 'none', 'reticle', 'none', 'glow-orbs', 'burst'];
export const fxFor = (ordinal: number): string => at(FX_CYCLE, ordinal);

/** Rhythm cut of a picture scene; almost always none, so a cut means something when it appears. */
const CUT_CYCLE = ['none', 'none', 'none', 'jump-punch', 'none', 'none', 'comic-panels', 'none', 'none', 'flash-freeze', 'none', 'none', 'quad', 'none', 'none', 'sakuga', 'none'];
export const cutFor = (ordinal: number): string => at(CUT_CYCLE, ordinal);

export type CaptionLook = 'bar' | 'pill' | 'chip' | 'ribbon';
const CAPTION_CYCLE: CaptionLook[] = ['bar', 'chip', 'pill', 'ribbon'];
export const captionLookFor = (ordinal: number): CaptionLook => at(CAPTION_CYCLE, ordinal);

const LAYOUT_CYCLE: CardsLayout[] = ['split', 'stack', 'mirror', 'badge'];
export const cardsLayoutFor = (ordinal: number): CardsLayout => at(LAYOUT_CYCLE, ordinal);

const PATTERN_CYCLE: SkyPattern[] = ['sparkles', 'dots', 'rays', 'stripes', 'sparkles', 'rays'];
export const skyPatternFor = (ordinal: number): SkyPattern => at(PATTERN_CYCLE, ordinal);
