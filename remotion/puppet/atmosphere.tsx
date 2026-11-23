import { AbsoluteFill } from 'remotion';

export const MOODS = ['calm', 'sea', 'storm', 'fire', 'magic', 'sad'] as const;
export type Mood = (typeof MOODS)[number];

/** Repeatable pseudo-random number in 0..1 for (seed, salt): the same frame always draws the same sky. */
const rnd = (seed: number, salt: number) => {
  const h = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

interface Look {
  tint: string;
  rays: number;
  /** Particle colour, count, rise speed (stage heights per second; negative falls) and size in stage-height thousandths. */
  dot: string;
  count: number;
  speed: number;
  size: number;
  streak?: boolean;
}

const LOOKS: Record<Mood, Look> = {
  calm: { tint: 'rgba(255,230,180,0.10)', rays: 0.16, dot: 'rgba(255,245,210,0.85)', count: 18, speed: 0.04, size: 5 },
  sea: { tint: 'rgba(60,170,200,0.14)', rays: 0.2, dot: 'rgba(255,255,255,0.8)', count: 34, speed: 0.1, size: 6 },
  storm: { tint: 'rgba(15,20,45,0.38)', rays: 0, dot: 'rgba(210,225,245,0.55)', count: 70, speed: -1.25, size: 3, streak: true },
  fire: { tint: 'rgba(255,90,30,0.16)', rays: 0.1, dot: 'rgba(255,170,60,0.95)', count: 40, speed: 0.16, size: 5 },
  magic: { tint: 'rgba(255,200,90,0.12)', rays: 0.24, dot: 'rgba(255,225,120,0.95)', count: 30, speed: 0.05, size: 6 },
  sad: { tint: 'rgba(70,90,140,0.26)', rays: 0, dot: 'rgba(200,215,240,0.5)', count: 14, speed: -0.04, size: 4 },
};

/** Light and weather over the background: a colour wash, soft sun rays, drifting particles, and lightning in a storm. */
export function Atmosphere({ mood, frame, fps, width, height, u }: { mood: Mood; frame: number; fps: number; width: number; height: number; u: number }) {
  const look = LOOKS[mood] ?? LOOKS.calm;
  const t = frame / fps;
  const flash = mood === 'storm' ? Math.max(0, Math.sin(t * 1.9 + 0.6) * Math.sin(t * 7.3)) ** 6 : 0;
  const dots = Array.from({ length: look.count }, (_, i) => {
    const phase = rnd(i, 1);
    const life = (t * Math.abs(look.speed) * (0.6 + rnd(i, 2) * 0.8) + phase) % 1;
    const rising = look.speed >= 0;
    const y = rising ? 1 - life : life;
    const x = (rnd(i, 3) + Math.sin(t * 0.8 + i) * 0.03 + (look.streak ? life * -0.12 : 0)) % 1;
    const fade = Math.sin(life * Math.PI);
    return { x, y, fade, r: look.size * (0.6 + rnd(i, 4) * 0.9) * u };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: look.tint, mixBlendMode: 'multiply' }} />
      {look.rays > 0 ? <AbsoluteFill style={{ background: `repeating-linear-gradient(105deg, rgba(255,246,215,${look.rays}) 0px, rgba(255,246,215,0) 90px, rgba(255,246,215,0) 220px)`, opacity: 0.55 + Math.sin(t * 0.7) * 0.2, maskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)' }} /> : null}
      {dots.map((d, i) =>
        look.streak ? (
          <div key={i} style={{ position: 'absolute', left: d.x * width, top: d.y * height, width: 2 * u, height: 46 * u, background: look.dot, opacity: d.fade * 0.7, transform: 'rotate(14deg)' }} />
        ) : (
          <div key={i} style={{ position: 'absolute', left: d.x * width, top: d.y * height, width: d.r * 2, height: d.r * 2, borderRadius: '50%', background: look.dot, opacity: d.fade, filter: `blur(${0.6 * u}px)`, boxShadow: `0 0 ${d.r * 3}px ${look.dot}` }} />
        ),
      )}
      {flash > 0.02 ? <AbsoluteFill style={{ background: `rgba(235,240,255,${flash * 0.7})` }} /> : null}
    </AbsoluteFill>
  );
}
