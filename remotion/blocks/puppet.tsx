import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { spanAt, tuneOf, type Extra, type Placement } from '../../src/core/domain/tune';
import { useBrand, useFont, useLayout } from '../primitives';
import { ANCHOR_X, companionFlip, companionSpriteAt, ENTER_SECONDS, EXIT_SECONDS, hasFrames, poseAt, smoothstep, spriteAt, talkBounce, type CompanionAction, type Emotion, type PuppetAction, type Side } from '../puppet/rig';
import { Atmosphere, type Mood } from '../puppet/atmosphere';

export interface PuppetSceneProps {
  caption: string;
  imagePrompt: string;
  emotion: Emotion;
  action: PuppetAction;
  side: Side;
  /** Weather and light of the set: particles, tint, rays. */
  mood: Mood;
  /** Id of one of the series' own poses (sprite `pose:<id>`) the hero holds while standing; '' for none. */
  pose: string;
  /** Id of a cast character who takes the main place instead of the series' hero (who is then not on stage); '' = hero. */
  lead: string;
  /** The supporting character's face. */
  companionEmotion: Emotion;
  /** Id of a supporting character from the series cast who stands opposite the hero; '' for none. */
  companion: string;
  /** What the supporting character does; `talk` gives it the line and the hero listens. */
  companionAction: CompanionAction;
  /** Id of a prop from the series cast that floats beside the hero; '' for none. */
  item: string;
  transition: 'auto' | import('../shots/entrance-meta').EntranceId;
}

/** Width / height of the box a sprite is drawn in (feet at the bottom centre). Wider than any sprite canvas (pose
 * canvases are 1.5 : 1), so every sprite is fitted by its height and the character keeps one size. */
const STAGE_ASPECT = 1.6;

const src = (s: string) => (/^(data:|https?:|\/)/.test(s) ? s : staticFile(s));

/**
 * A character (expression and pose sprites from the series bible) acting on an AI-painted empty background:
 * it walks in (walk cycle), talks (mouth sprite and bounce), blinks, shows an emotion, gestures (wave, point, bow…) and walks out.
 */
export function PuppetScene({ _tune, caption, emotion, action, side, mood, pose: ownPose, lead, companion, companionAction, companionEmotion, item, image, sprites: heroSprites, cast }: PuppetSceneProps & { _tune?: unknown; image?: string; sprites?: Record<string, string>; cast?: Record<string, string> }) {
  const frame = useCurrentFrame();
  const tune = tuneOf({ _tune });
  const AT: Placement = { dx: 0, dy: 0, scale: 1 };
  const heroAt = tune.hero ?? AT;
  const { fps, durationInFrames } = useVideoConfig();
  const { u, width, height } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const now = frame / fps;
  const heroOn = spanAt(tune.heroTime, now).on;
  const friend = spanAt(tune.companionTime, now);
  const thing = spanAt(tune.itemTime, now);
  const weather = spanAt(tune.effectTime, now);
  const t = frame / fps;
  const duration = durationInFrames / fps;
  // A cast character in the main place acts with its own pictures; the hero's own poses do not apply to it.
  const posesOf = (id: string) => Object.fromEntries(Object.entries(cast ?? {}).filter(([k]) => k.startsWith(`${id}:`)).map(([k, v]) => [k.slice(id.length + 1), v]));
  const sprites: Record<string, string> | undefined = lead ? (cast?.[lead] ? { ...posesOf(lead), neutral: cast[lead]! } : {}) : heroSprites;
  const available = Object.keys(sprites ?? {});
  const talkFrom = action === 'enter' ? ENTER_SECONDS : 0.3;
  const talkTo = action === 'exit' ? duration - EXIT_SECONDS : duration - 0.4;
  // When the supporting character has the line, the hero listens (no mouth, no talking bounce).
  const companionTalks = companionAction === 'talk' && Boolean(companion);
  const talking = !companionTalks && t > talkFrom && t < talkTo;
  const pose = poseAt(action, side, t, duration, hasFrames(action, available));
  const bounce = talkBounce(t, talking);
  const shown = spriteAt({ action, side, emotion, talking, t, duration, available, pose: lead ? '' : (ownPose ?? '') });
  const sprite = sprites?.[shown.sprite] ?? sprites?.neutral;
  // A slow push-in with a sideways drift; the base zoom also crops the thin frame line some pictures carry at their edge.
  const bgZoom = interpolate(frame, [0, durationInFrames], [1.05, 1.13], { extrapolateRight: 'clamp' });
  const drift = interpolate(frame, [0, durationInFrames], [0, side === 'left' ? 22 : -22], { extrapolateRight: 'clamp' }) * u;
  // A grown-up in the main place stands as tall as one in the companion's place.
  const stageH = height * 0.66;
  const mainH = lead ? stageH * 0.86 : stageH;
  const ground = height * 0.17;
  const companionPoses = companion ? posesOf(companion) : {};
  const companionPose = companion ? companionSpriteAt({ action: companionAction ?? 'idle', emotion: companionEmotion ?? 'neutral', t, available: Object.keys(companionPoses), talkTo }) : null;
  const companionFile = companion ? (companionPose ? companionPoses[companionPose] : undefined) ?? cast?.[companion] : undefined;
  const companionSrc = companionFile ? src(companionFile) : null;
  const itemSrc = item && cast?.[item] ? src(cast[item]) : null;
  const accent = brand.palette[1] ?? '#FFC53D';

  return (
    <AbsoluteFill style={{ background: '#1b1b1b' }}>
      {image ? <Img src={src(image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${drift}px) scale(${bgZoom})` }} /> : null}
      {weather.on ? <Atmosphere mood={mood ?? 'calm'} frame={Math.round(weather.local * fps)} fps={fps} width={width} height={height} u={u} /> : null}
      {companionSrc && friend.on ? <Companion at={tune.companion ?? AT} height={height} src={companionSrc} side={side} t={friend.local} width={width} stageH={stageH} ground={ground} u={u} talking={companionPose === 'talk' || (companionTalks && t > 0.3 && t < talkTo)} flip={companionFlip(companionPose, side)} /> : null}
      {(tune.extras ?? []).filter((e) => e.kind === 'person').map((e, i) => <ExtraFigure key={`${e.id}-${i}`} extra={e} index={i} cast={cast} posesOf={posesOf} now={now} width={width} height={height} stageH={stageH} ground={ground} u={u} />)}
      <div
        style={{
          position: 'absolute',
          left: (pose.x + heroAt.dx) * width - (mainH * STAGE_ASPECT) / 2,
          bottom: ground + (pose.y + bounce.y - heroAt.dy) * height,
          width: mainH * STAGE_ASPECT,
          height: mainH,
          opacity: heroOn ? pose.alpha : 0,
          transformOrigin: '50% 100%',
          transform: `rotate(${pose.angle}deg) scale(${pose.scale * pose.squashX * heroAt.scale}, ${pose.scale * pose.squashY * bounce.squashY * heroAt.scale})`,
        }}
      >
        {sprite ? (
          <Img src={src(sprite)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', transform: shown.flip ? 'scaleX(-1)' : undefined }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: font, fontSize: 40 * u, textAlign: 'center', border: `${4 * u}px dashed ${accent}`, borderRadius: 24 * u }}>
            Chưa có ảnh nhân vật
          </div>
        )}
      </div>
      {itemSrc && thing.on ? <FloatingItem at={tune.item ?? AT} height={height} src={itemSrc} heroX={pose.x + heroAt.dx} t={thing.local} width={width} stageH={stageH} ground={ground} u={u} /> : null}
      <div style={{ position: 'absolute', left: (pose.x + heroAt.dx) * width - stageH * 0.2 * heroAt.scale, bottom: ground - 14 * u - heroAt.dy * height, width: stageH * 0.4 * heroAt.scale, height: 28 * u, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: `blur(${6 * u}px)`, opacity: heroOn ? pose.alpha * (1 - pose.y * 3) : 0 }} />
      {(tune.extras ?? []).filter((e) => e.kind === 'item').map((e, i) => <ExtraFigure key={`${e.id}-${i}`} extra={e} index={i} cast={cast} posesOf={posesOf} now={now} width={width} height={height} stageH={stageH} ground={ground} u={u} />)}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,5,0.38) 100%)', pointerEvents: 'none' }} />
      {caption && tune.captionPlace !== 'off' ? (
        <div style={{ position: 'absolute', left: 0, right: 0, ...(tune.captionPlace === 'top' ? { top: 28 * u } : { bottom: 28 * u }), display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: `${12 * u}px ${36 * u}px`, borderRadius: 999, background: 'rgba(255,255,255,0.94)', fontFamily: font, fontWeight: 800, fontSize: 52 * u, color: '#222' }}>{caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** One of the added people or things: a person breathes and acts like the companion, a thing hovers. */
function ExtraFigure({ extra: e, index, cast, posesOf, now, width, height, stageH, ground, u }: { extra: Extra; index: number; cast?: Record<string, string>; posesOf: (id: string) => Record<string, string>; now: number; width: number; height: number; stageH: number; ground: number; u: number }) {
  const { on, local } = spanAt(e.time, now);
  if (!on || !cast?.[e.id]) return null;
  const appear = smoothstep(local / 0.5);
  if (e.kind === 'item') {
    const size = stageH * 0.5 * e.scale;
    return (
      <div style={{ position: 'absolute', left: e.x * width - size / 2, bottom: ground + e.y * height + Math.sin(now * 2.2 + index) * 0.02 * stageH, width: size, height: size, opacity: appear, transform: `rotate(${Math.sin(now * 1.3 + index) * 9}deg) scale(${0.7 + appear * 0.3})`, filter: `drop-shadow(0 0 ${22 * u}px rgba(255,200,80,0.85))` }}>
        <Img src={src(cast[e.id]!)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  const poses = posesOf(e.id);
  const pose = companionSpriteAt({ action: e.action, emotion: e.emotion, t: now + index * 0.4, available: Object.keys(poses) });
  const file = (pose ? poses[pose] : undefined) ?? cast[e.id]!;
  const h = stageH * 0.86 * e.scale;
  const bounce = talkBounce(now + index * 0.37, e.action === 'talk');
  const breathe = (1 + Math.sin(now * 2.4 + index) * 0.014) * bounce.squashY;
  const bottom = ground + e.y * height;
  return (
    <>
      <div style={{ position: 'absolute', left: e.x * width - h * 0.18, bottom: bottom - 12 * u, width: h * 0.36, height: 24 * u, opacity: appear, borderRadius: '50%', background: 'rgba(0,0,0,0.26)', filter: `blur(${6 * u}px)` }} />
      <div style={{ position: 'absolute', left: e.x * width - (h * STAGE_ASPECT) / 2, bottom: bottom + bounce.y * stageH, width: h * STAGE_ASPECT, height: h, opacity: appear, transformOrigin: '50% 100%', transform: `scale(${2 - breathe}, ${breathe})` }}>
        {/* Those right of the middle turn to face it, as the companion does. */}
        <Img src={src(file)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', transform: companionFlip(pose, e.x > 0.5 ? 'left' : 'right') ? 'scaleX(-1)' : undefined }} />
      </div>
    </>
  );
}

/** A supporting character on the side opposite the hero: it slides in, then breathes and sways. */
function Companion({ at, height, src: file, side, t, width, stageH, ground, u, talking, flip }: { at: Placement; height: number; src: string; side: Side; t: number; width: number; stageH: number; ground: number; u: number; talking: boolean; flip: boolean }) {
  const from = side === 'right' ? 'left' : 'right';
  const k = smoothstep((t - 0.2) / 0.9);
  const x = (from === 'left' ? -0.2 : 1.2) + (ANCHOR_X[from === 'left' ? 'left' : 'right'] + at.dx - (from === 'left' ? -0.2 : 1.2)) * k;
  const bounce = talkBounce(t + 0.37, talking);
  const breathe = (1 + Math.sin(t * 2.4 + 1) * 0.014) * bounce.squashY;
  const h = stageH * 0.86 * at.scale;
  return (
    <>
      <div style={{ position: 'absolute', left: x * width - h * 0.18, bottom: ground - 12 * u - at.dy * height, width: h * 0.36, height: 24 * u, borderRadius: '50%', background: 'rgba(0,0,0,0.26)', filter: `blur(${6 * u}px)` }} />
      <div style={{ position: 'absolute', left: x * width - (h * STAGE_ASPECT) / 2, bottom: ground + bounce.y * stageH - at.dy * height, width: h * STAGE_ASPECT, height: h, transformOrigin: '50% 100%', transform: `rotate(${Math.sin(t * 1.7 + 2) * 1.4}deg) scale(${2 - breathe}, ${breathe})` }}>
        <Img src={file} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', transform: flip ? 'scaleX(-1)' : undefined }} />
      </div>
    </>
  );
}

/** A prop (a ribbon, a ring) that hovers beside the hero, bobbing and glowing. */
function FloatingItem({ at, height, src: file, heroX, t, width, stageH, ground, u }: { at: Placement; height: number; src: string; heroX: number; t: number; width: number; stageH: number; ground: number; u: number }) {
  const dir = heroX > 0.5 ? -1 : 1;
  const size = stageH * 0.5 * at.scale;
  const bob = Math.sin(t * 2.2) * 0.02;
  const appear = smoothstep((t - 0.5) / 0.6);
  return (
    <div
      style={{
        position: 'absolute',
        left: (heroX + dir * 0.17 + at.dx) * width - size / 2,
        bottom: ground + stageH * (0.42 + bob) - at.dy * height,
        width: size,
        height: size,
        opacity: appear,
        transform: `rotate(${Math.sin(t * 1.3) * 9}deg) scale(${0.7 + appear * 0.3})`,
        filter: `drop-shadow(0 0 ${22 * u}px rgba(255,200,80,0.85))`,
      }}
    >
      <Img src={file} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}
