// Camera moves over a still picture. A pose is where the camera is at progress t (0..1) of the scene; the stage
// turns it into a 3D transform, so the same moves work for any picture block.
import { handheld } from './noise';

export const MOVES = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'drift-up', 'drift-down', 'orbit-left', 'orbit-right', 'tilt-glide', 'overhead', 'crash-zoom', 'slide-parallax', 'bullet-time', 'pull-back', 'drone-dive', 'graze-slide', 'steep-slide', 'handheld-push'] as const;
export type Motion = (typeof MOVES)[number];

export interface Pose {
  scale: number;
  /** Shift in percent of the frame. */
  x: number;
  y: number;
  /** Degrees. rotX leans the top away (looking down at a table), rotY turns the picture about the vertical axis. */
  rotX: number;
  rotY: number;
  rotZ: number;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const inOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const flat = (p: Partial<Pose>): Pose => ({ scale: 1, x: 0, y: 0, rotX: 0, rotY: 0, rotZ: 0, ...p });

/** The camera pose at progress t of the scene. `frame` only feeds the hand-held drift. */
export function poseAt(move: Motion, t: number, frame = 0): Pose {
  const e = ease(t);
  let pose: Pose;
  switch (move) {
    case 'zoom-out':
      pose = flat({ scale: 1.16 - 0.12 * e });
      break;
    case 'pan-left':
      pose = flat({ scale: 1.12, x: 3 - 6 * e });
      break;
    case 'pan-right':
      pose = flat({ scale: 1.12, x: -3 + 6 * e });
      break;
    case 'drift-up':
      pose = flat({ scale: 1.1, y: 2.5 - 5 * e });
      break;
    case 'drift-down':
      pose = flat({ scale: 1.1, y: -2.5 + 5 * e });
      break;
    case 'orbit-left':
      // Swings round the picture from one side to the other while it pushes in a little.
      pose = flat({ scale: 1.2 - 0.04 * e, x: 2 - 4 * e, rotY: lerp(13, -13, e) });
      break;
    case 'orbit-right':
      pose = flat({ scale: 1.2 - 0.04 * e, x: -2 + 4 * e, rotY: lerp(-13, 13, e) });
      break;
    case 'tilt-glide':
      pose = flat({ scale: lerp(1.22, 1.15, e), y: 3 - 6 * e, rotX: lerp(17, 6, e), rotY: lerp(-5, 5, e) });
      break;
    case 'overhead':
      // Starts steeply tilted like a table seen from above and settles to face the viewer.
      pose = flat({ scale: lerp(1.32, 1.12, e), y: 6 * (1 - e), rotX: lerp(38, 8, e) });
      break;
    case 'crash-zoom':
      // A fast punch in over the first tenth of the scene, then a slow creep.
      pose = flat({ scale: 1 + 0.34 * easeOutExpo(Math.min(1, t * 10)) + 0.05 * t });
      break;
    case 'slide-parallax':
      pose = flat({ scale: 1.14, x: -4 + 8 * e, rotY: lerp(-3, 3, e) });
      break;
    case 'bullet-time':
      // Time seems to stop while the camera sweeps a wide arc around the picture.
      pose = flat({ scale: 1.26, x: lerp(3, -3, e), rotY: lerp(24, -24, e) });
      break;
    case 'pull-back':
      // Starts close and drifts away so the subject ends up small and alone in its frame.
      pose = flat({ scale: lerp(1.5, 1.05, 1 - (1 - t) ** 2), y: lerp(-2, 1, e) });
      break;
    case 'drone-dive':
      // A steep look from above that dives and levels out as it lands on the picture.
      pose = flat({ scale: lerp(1.5, 1.1, e), y: lerp(8, 0, e), rotX: lerp(52, 4, inOutQuad(t)) });
      break;
    case 'graze-slide':
      // Low across the surface: strongly turned, sliding past.
      pose = flat({ scale: 1.34, x: lerp(7, -7, e), rotY: lerp(40, 34, e), rotX: 6 });
      break;
    case 'steep-slide':
      pose = flat({ scale: 1.3, x: lerp(-8, 8, e), rotY: lerp(-48, -40, e) });
      break;
    case 'handheld-push':
      pose = flat({ scale: 1.04 + 0.16 * t });
      break;
    default:
      pose = flat({ scale: 1.02 + 0.12 * e, y: -1 * e });
  }
  // A crash zoom shakes hard as it lands and calms down; everything else only breathes.
  const shake = move === 'crash-zoom' ? 0.18 + 1.6 * Math.exp(-t * 18) : move === 'handheld-push' ? 0.55 : 0.12;
  const h = handheld(frame, shake);
  return { ...pose, x: pose.x + h.x * 0.25, y: pose.y + h.y * 0.25, rotZ: pose.rotZ + h.x * 0.12 };
}
