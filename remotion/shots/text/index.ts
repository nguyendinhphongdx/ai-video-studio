import type { TextShot } from './common';
import { CYCLE_COMPONENTS } from './cycles';
import { ENTRANCE_COMPONENTS } from './entrances';
import { TEXT_SHOT_META } from './meta';

export type { ShotInput, ShotTheme, TextShot } from './common';
export { TEXT_SHOT_META } from './meta';

const COMPONENTS = { ...ENTRANCE_COMPONENTS, ...CYCLE_COMPONENTS };

/** Every text shot: its meta joined to its drawing. */
export const TEXT_SHOTS: TextShot[] = TEXT_SHOT_META.map((m) => ({ ...m, Component: COMPONENTS[m.id]! }));
export const TEXT_SHOT_BY_ID: Record<string, TextShot> = Object.fromEntries(TEXT_SHOTS.map((s) => [s.id, s]));
