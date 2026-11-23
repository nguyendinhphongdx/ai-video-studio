import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { useBrand, useFont, useLayout } from '../primitives';
import { ENTER_SECONDS, EXIT_SECONDS, expressionAt, poseAt, talkBounce, type Emotion, type PuppetAction, type Side } from '../puppet/rig';

export interface PuppetSceneProps {
  caption: string;
  imagePrompt: string;
  emotion: Emotion;
  action: PuppetAction;
  side: Side;
  transition: 'auto' | import('../shots/entrance-meta').EntranceId;
}

const src = (s: string) => (/^(data:|https?:|\/)/.test(s) ? s : staticFile(s));

/**
 * A character (set of expression sprites from the series bible) acting on an AI-painted empty background:
 * it walks in, talks (mouth sprite and bounce), blinks, shows an emotion, and walks out.
 */
export function PuppetScene({ caption, emotion, action, side, image, sprites }: PuppetSceneProps & { image?: string; sprites?: Record<string, string> }) {
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
  const bgZoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], { extrapolateRight: 'clamp' });
  const stageH = height * 0.66;
  const ground = height * 0.17;
  const accent = brand.palette[1] ?? '#FFC53D';

  return (
    <AbsoluteFill style={{ background: '#1b1b1b' }}>
      {image ? <Img src={src(image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${bgZoom})` }} /> : null}
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
      <div style={{ position: 'absolute', left: pose.x * width - stageH * 0.2, bottom: ground - 14 * u, width: stageH * 0.4, height: 28 * u, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', filter: `blur(${6 * u}px)`, opacity: pose.alpha * (1 - pose.y * 3) }} />
      {caption ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28 * u, display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: `${12 * u}px ${36 * u}px`, borderRadius: 999, background: 'rgba(255,255,255,0.94)', fontFamily: font, fontWeight: 800, fontSize: 52 * u, color: '#222' }}>{caption}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
