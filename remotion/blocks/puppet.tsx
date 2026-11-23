import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { useBrand, useFont, useLayout } from '../primitives';
import { ANCHOR_X, ENTER_SECONDS, EXIT_SECONDS, expressionAt, poseAt, smoothstep, talkBounce, type Emotion, type PuppetAction, type Side } from '../puppet/rig';
import { Atmosphere, type Mood } from '../puppet/atmosphere';

export interface PuppetSceneProps {
  caption: string;
  imagePrompt: string;
  emotion: Emotion;
  action: PuppetAction;
  side: Side;
  /** Weather and light of the set: particles, tint, rays. */
  mood: Mood;
  /** Id of a supporting character from the series cast who stands opposite the hero; '' for none. */
  companion: string;
  /** Id of a prop from the series cast that floats beside the hero; '' for none. */
  item: string;
  transition: 'auto' | import('../shots/entrance-meta').EntranceId;
}

const src = (s: string) => (/^(data:|https?:|\/)/.test(s) ? s : staticFile(s));

/**
 * A character (set of expression sprites from the series bible) acting on an AI-painted empty background:
 * it walks in, talks (mouth sprite and bounce), blinks, shows an emotion, and walks out.
 */
export function PuppetScene({ caption, emotion, action, side, mood, companion, item, image, sprites, cast }: PuppetSceneProps & { image?: string; sprites?: Record<string, string>; cast?: Record<string, string> }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u, width, height } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const t = frame / fps;
  const duration = durationInFrames / fps;
  const available = Object.keys(sprites ?? {});
  const talkFrom = action === 'enter' ? ENTER_SECONDS : 0.3;
  const talkTo = action === 'exit' ? duration - EXIT_SECONDS : duration - 0.4;
  const talking = t > talkFrom && t < talkTo;
  const pose = poseAt(action, side, t, duration);
  const bounce = talkBounce(t, talking);
  const expr = expressionAt({ emotion, talking, t, available });
  const sprite = sprites?.[expr] ?? sprites?.neutral;
  // A slow push-in with a sideways drift; the base zoom also crops the thin frame line some pictures carry at their edge.
  const bgZoom = interpolate(frame, [0, durationInFrames], [1.05, 1.13], { extrapolateRight: 'clamp' });
  const drift = interpolate(frame, [0, durationInFrames], [0, side === 'left' ? 22 : -22], { extrapolateRight: 'clamp' }) * u;
  const stageH = height * 0.66;
  const ground = height * 0.17;
  const companionSrc = companion && cast?.[companion] ? src(cast[companion]) : null;
  const itemSrc = item && cast?.[item] ? src(cast[item]) : null;
  const accent = brand.palette[1] ?? '#FFC53D';

  return (
    <AbsoluteFill style={{ background: '#1b1b1b' }}>
      {image ? <Img src={src(image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${drift}px) scale(${bgZoom})` }} /> : null}
      <Atmosphere mood={mood ?? 'calm'} frame={frame} fps={fps} width={width} height={height} u={u} />
      {companionSrc ? <Companion src={companionSrc} side={side} t={t} width={width} stageH={stageH} ground={ground} u={u} /> : null}
      <div
        style={{
          position: 'absolute',
          left: pose.x * width - stageH * 0.55,
          bottom: ground + (pose.y + bounce.y) * height,
          width: stageH * 1.1,
          height: stageH,
          opacity: pose.alpha,
          transformOrigin: '50% 100%',
          transform: `rotate(${pose.angle}deg) scale(${pose.scale * pose.squashX}, ${pose.scale * pose.squashY * bounce.squashY})`,
        }}
      >
        {sprite ? (
          <Img src={src(sprite)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: font, fontSize: 40 * u, textAlign: 'center', border: `${4 * u}px dashed ${accent}`, borderRadius: 24 * u }}>
            Chưa có ảnh nhân vật
          </div>
        )}
      </div>
      {itemSrc ? <FloatingItem src={itemSrc} heroX={pose.x} t={t} width={width} stageH={stageH} ground={ground} u={u} /> : null}
      <div style={{ position: 'absolute', left: pose.x * width - stageH * 0.2, bottom: ground - 14 * u, width: stageH * 0.4, height: 28 * u, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: `blur(${6 * u}px)`, opacity: pose.alpha * (1 - pose.y * 3) }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,5,0.38) 100%)', pointerEvents: 'none' }} />
      {caption ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28 * u, display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: `${12 * u}px ${36 * u}px`, borderRadius: 999, background: 'rgba(255,255,255,0.94)', fontFamily: font, fontWeight: 800, fontSize: 52 * u, color: '#222' }}>{caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** A supporting character on the side opposite the hero: it slides in, then breathes and sways. */
function Companion({ src: file, side, t, width, stageH, ground, u }: { src: string; side: Side; t: number; width: number; stageH: number; ground: number; u: number }) {
  const from = side === 'right' ? 'left' : 'right';
  const k = smoothstep((t - 0.2) / 0.9);
  const x = (from === 'left' ? -0.2 : 1.2) + (ANCHOR_X[from === 'left' ? 'left' : 'right'] - (from === 'left' ? -0.2 : 1.2)) * k;
  const breathe = 1 + Math.sin(t * 2.4 + 1) * 0.014;
  const h = stageH * 0.86;
  return (
    <>
      <div style={{ position: 'absolute', left: x * width - h * 0.18, bottom: ground - 12 * u, width: h * 0.36, height: 24 * u, borderRadius: '50%', background: 'rgba(0,0,0,0.26)', filter: `blur(${6 * u}px)` }} />
      <div style={{ position: 'absolute', left: x * width - h * 0.55, bottom: ground, width: h * 1.1, height: h, transformOrigin: '50% 100%', transform: `rotate(${Math.sin(t * 1.7 + 2) * 1.4}deg) scale(${2 - breathe}, ${breathe})` }}>
        <Img src={file} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
      </div>
    </>
  );
}

/** A prop (a ribbon, a ring) that hovers beside the hero, bobbing and glowing. */
function FloatingItem({ src: file, heroX, t, width, stageH, ground, u }: { src: string; heroX: number; t: number; width: number; stageH: number; ground: number; u: number }) {
  const dir = heroX > 0.5 ? -1 : 1;
  const size = stageH * 0.5;
  const bob = Math.sin(t * 2.2) * 0.02;
  const appear = smoothstep((t - 0.5) / 0.6);
  return (
    <div
      style={{
        position: 'absolute',
        left: (heroX + dir * 0.17) * width - size / 2,
        bottom: ground + stageH * (0.42 + bob),
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
