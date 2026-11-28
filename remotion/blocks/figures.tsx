// People, things and effects that walk, act and flash over a scene: shared by the drawn-figure and picture blocks.
import { AbsoluteFill, Img, staticFile } from 'remotion';

import { actingAt, animAt, moveAt, spanAt, type Anim, type Extra, type Move } from '../../src/core/domain/tune';
import { companionFlip, companionSpriteAt, smoothstep, talkBounce } from '../puppet/rig';

/** Width / height of the box a sprite is drawn in (feet at the bottom centre). Wider than any sprite canvas (pose
 * canvases are 1.5 : 1), so every sprite is fitted by its height and the character keeps one size. */
export const STAGE_ASPECT = 1.6;

export const src = (s: string) => (/^(data:|https?:|\/)/.test(s) ? s : staticFile(s));

export const posesIn = (cast: Record<string, string> | undefined) => (id: string) => Object.fromEntries(Object.entries(cast ?? {}).filter(([k]) => k.startsWith(`${id}:`)).map(([k, v]) => [k.slice(id.length + 1), v]));

/** The individual transform properties, so walking and animating add to a figure's own `transform` without
 * rewriting it. `fw`, `fh` are the figure's size (the animation's unit); legs are measured on the frame. */
export function moving(fig: { anim?: Anim; moves?: Move[] }, t: number, fw: number, fh: number, width: number, height: number) {
  if (!fig.anim && !fig.moves) return {};
  const at = moveAt(fig.moves, t);
  const own = animAt(fig.anim, t);
  const waiting = animAt(at.there?.leg.then ? { type: at.there.leg.then, speed: 1, power: 1 } : undefined, at.there?.for ?? 0);
  // A small step bob while walking (a spinning thing is flying, not walking).
  const step = at.going && !at.spin ? Math.abs(Math.sin(t * 9)) * 0.018 * fh : 0;
  return {
    translate: `${at.x * width + (own.x + waiting.x) * fw}px ${-(at.y * height + (own.y + waiting.y) * fh + step)}px`,
    rotate: `${own.rotate + waiting.rotate + at.spin}deg`,
    scale: `${own.sx * waiting.sx * at.scale} ${own.sy * waiting.sy * at.scale}`,
  };
}

/** A shadow follows the walk along the ground but neither jumps nor spins. */
export const walked = (fig: { moves?: Move[] }, t: number, width: number, height: number) => {
  if (!fig.moves) return {};
  const at = moveAt(fig.moves, t);
  return { translate: `${at.x * width}px ${-at.y * height}px`, scale: `${at.scale}` };
};

/** Stars that twinkle, a flash, or the ring of a blow, `age` seconds after it starts; drawn over its box. */
export function Burst({ kind, age, u }: { kind: 'sparkle' | 'flash' | 'impact'; age: number; u: number }) {
  if (kind === 'sparkle') {
    if (age > 1.8) return null;
    return (
      <>
        {[[8, 18], [82, 10], [92, 62], [18, 84], [50, -4], [60, 94]].map(([x, y], i) => {
          const shine = Math.max(0, Math.sin(age * 9 + i * 1.7)) * Math.min(1, (1.8 - age) * 2);
          return (
            <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, fontSize: 46 * u, lineHeight: 1, color: '#fff7c2', opacity: shine, transform: `translate(-50%, -50%) scale(${0.5 + shine})`, textShadow: `0 0 ${3 * u}px #e07a00, 0 0 ${6 * u}px #e07a00, 0 0 ${18 * u}px #ffd24a` }}>
              ✦
            </div>
          );
        })}
      </>
    );
  }
  const length = kind === 'flash' ? 0.45 : 0.7;
  if (age > length) return null;
  const k = age / length;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '90%',
        aspectRatio: '1',
        borderRadius: '50%',
        transform: `translate(-50%, -50%) scale(${0.4 + k * (kind === 'flash' ? 1 : 1.8)})`,
        opacity: 1 - k,
        background: kind === 'flash' ? 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,230,140,0) 70%)' : 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,160,40,0.7) 30%, rgba(255,90,20,0) 62%)',
        border: kind === 'impact' ? `${10 * u * (1 - k)}px solid rgba(255,255,255,0.9)` : undefined,
      }}
    />
  );
}

/** What happens where a leg ends. */
export function Arrival({ moves, t, u }: { moves?: Move[]; t: number; u: number }) {
  const { there } = moveAt(moves, t);
  return there?.leg.effect ? <Burst kind={there.leg.effect} age={there.for} u={u} /> : null;
}

/** One of the added people or things: a person breathes and acts like the companion, a thing hovers. */
export function ExtraFigure({ extra: e, index, cast, posesOf, now, width, height, stageH, ground, u }: { extra: Extra; index: number; cast?: Record<string, string>; posesOf: (id: string) => Record<string, string>; now: number; width: number; height: number; stageH: number; ground: number; u: number }) {
  const { on, local } = spanAt(e.time, now);
  if (on && e.kind === 'fx') {
    const box = stageH * 0.55 * e.scale;
    // Twinkles keep coming for as long as the layer lasts; a flash or a blow happens once.
    return (
      <div style={{ position: 'absolute', left: e.x * width - box / 2, bottom: ground + e.y * height, width: box, height: box, ...moving(e, local, box, box, width, height) }}>
        <Burst kind={e.id as 'sparkle' | 'flash' | 'impact'} age={e.id === 'sparkle' ? local % 1.6 : local} u={u} />
      </div>
    );
  }
  if (!on || !cast?.[e.id]) return null;
  const appear = smoothstep(local / 0.5);
  // Walking in starts just outside that side of the frame; popping overshoots a little.
  const from = e.enter === 'left' ? -0.25 - e.x : e.enter === 'right' ? 1.25 - e.x : 0;
  const slide = from * width * (1 - smoothstep(local / 1.1));
  const pop = e.enter === 'pop' ? appear * (1 + Math.sin(appear * Math.PI) * 0.25) : 1;
  const shown = from ? 1 : appear;
  if (e.kind === 'item') {
    const size = stageH * 0.5 * e.scale;
    const bob = e.motion === 'float' ? Math.sin(now * 2.2 + index) * 0.02 * stageH : 0;
    const turn = e.motion === 'spin' ? local * 140 : e.motion === 'float' ? Math.sin(now * 1.3 + index) * 9 : 0;
    return (
      <div style={{ position: 'absolute', left: e.x * width - size / 2 + slide, bottom: ground + e.y * height + bob, width: size, height: size, opacity: shown, ...moving(e, local, size, size, width, height), transform: `rotate(${turn}deg) scale(${e.enter === 'pop' ? pop : 0.7 + appear * 0.3}) ${e.flip ? 'scaleX(-1)' : ''}`, filter: e.glow ? `drop-shadow(0 0 ${22 * u}px rgba(255,200,80,0.85))` : undefined }}>
        <Img src={src(cast[e.id]!)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        <Arrival moves={e.moves} t={local} u={u} />
      </div>
    );
  }
  const poses = posesOf(e.id);
  const acts = actingAt(e.moves, local);
  const pose = companionSpriteAt({ action: acts.action ?? e.action, emotion: acts.emotion ?? e.emotion, t: now + index * 0.4, available: Object.keys(poses) });
  const file = (pose ? poses[pose] : undefined) ?? cast[e.id]!;
  const h = stageH * 0.86 * e.scale;
  const bounce = talkBounce(now + index * 0.37, (acts.action ?? e.action) === 'talk');
  const breathe = (1 + Math.sin(now * 2.4 + index) * 0.014) * bounce.squashY;
  const bottom = ground + e.y * height;
  return (
    <>
      <div style={{ position: 'absolute', left: e.x * width - h * 0.18 + slide, bottom: bottom - 12 * u, width: h * 0.36, height: 24 * u, opacity: shown, borderRadius: '50%', background: 'rgba(0,0,0,0.26)', filter: `blur(${6 * u}px)`, ...walked(e, local, width, height) }} />
      <div style={{ position: 'absolute', left: e.x * width - (h * STAGE_ASPECT) / 2 + slide, bottom: bottom + bounce.y * stageH, width: h * STAGE_ASPECT, height: h, opacity: shown, transformOrigin: '50% 100%', ...moving(e, local, h * 0.34, h, width, height), transform: `scale(${(2 - breathe) * pop}, ${breathe * pop})` }}>
        {/* Those right of the middle turn to face it, as the companion does. */}
        <Img src={src(file)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', transform: companionFlip(pose, e.x > 0.5 ? 'left' : 'right') !== e.flip ? 'scaleX(-1)' : undefined }} />
        <Arrival moves={e.moves} t={local} u={u} />
      </div>
    </>
  );
}

/** Added figures over a painted picture, in screen space (they do not follow the camera move). */
export function Overlay({ extras, cast, now, width, height, u }: { extras: Extra[]; cast?: Record<string, string>; now: number; width: number; height: number; u: number }) {
  const posesOf = posesIn(cast);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {extras.map((e, i) => (
        <ExtraFigure key={`${e.id}-${i}`} extra={e} index={i} cast={cast} posesOf={posesOf} now={now} width={width} height={height} stageH={height * 0.66} ground={height * 0.17} u={u} />
      ))}
    </AbsoluteFill>
  );
}
