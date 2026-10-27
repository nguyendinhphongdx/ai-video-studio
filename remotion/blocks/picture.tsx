import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { shade, useBrand, useFont, useLayout } from '../primitives';

import { DepthStage } from '../camera/DepthStage';
import type { FxId } from '../shots/fx-meta';
import { FxLayer } from '../shots/fx';

import { autoMotion, fxFor, captionLookFor, layeredFor, type Motion } from './variants';

export interface PictureSceneProps {
  caption: string;
  imagePrompt: string;
  motion: 'auto' | Motion;
  fx: 'auto' | FxId;
  shot: 'auto' | 'wide' | 'close-up' | 'macro' | 'top-down' | 'low-angle' | 'diagonal' | 'left-third' | 'right-third' | 'split' | 'scale-contrast' | 'frame-in-frame' | 'cluster';
}


/** A full-frame AI picture with a camera move and a lower-third caption in the channel colours. */
export function PictureScene({ caption, imagePrompt, motion, fx, image, ordinal = 1 }: PictureSceneProps & { image?: string; ordinal?: number }) {
  const fxKind = (!fx || fx === 'auto' ? fxFor(ordinal) : fx) as FxId;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const brand = useBrand();
  const font = useFont();
  const main = brand.palette[0] ?? '#4F46E5';
  const accent = brand.palette[1] ?? '#FFC53D';
  const src = image ? (/^(data:|https?:|\/)/.test(image) ? image : staticFile(image)) : null;
  const look = captionLookFor(ordinal);
  const s = spring({ frame: frame - 12, fps, config: { damping: 15, stiffness: 100 } });
  const size = (caption.length > 34 ? 56 : 70) * u;
  const text: React.CSSProperties = { fontFamily: font, fontWeight: 800, fontSize: size, lineHeight: 1.1, color: 'white' };

  let tag: React.ReactNode = null;
  if (caption) {
    if (look === 'bar') {
      tag = (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `${34 * u}px ${(portrait ? 60 : 120) * u}px ${(portrait ? 190 : 60) * u}px`, background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))', transform: `translateY(${interpolate(s, [0, 1], [160 * u, 0])}px)` }}>
          <div style={{ width: 150 * u * s, height: 9 * u, background: accent, borderRadius: 9 * u, marginBottom: 20 * u }} />
          <div style={text}>{caption}</div>
        </div>
      );
    } else if (look === 'chip') {
      tag = (
        <div style={{ position: 'absolute', left: (portrait ? 60 : 110) * u, top: (portrait ? 170 : 100) * u, maxWidth: (portrait ? 900 : 1200) * u, padding: `${16 * u}px ${38 * u}px`, background: main, borderRadius: 18 * u, boxShadow: `0 ${12 * u}px ${28 * u}px rgba(0,0,0,0.35)`, transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [-6, 0])}deg)`, transformOrigin: 'left top' }}>
          <div style={{ ...text, fontSize: size * 0.9 }}>{caption}</div>
        </div>
      );
    } else if (look === 'pill') {
      tag = (
        <div style={{ position: 'absolute', left: '50%', bottom: (portrait ? 210 : 90) * u, maxWidth: (portrait ? 920 : 1400) * u, transform: `translateX(-50%) translateY(${interpolate(s, [0, 1], [120 * u, 0])}px)`, padding: `${18 * u}px ${52 * u}px`, background: 'rgba(255,255,255,0.94)', borderRadius: 999, boxShadow: `0 ${12 * u}px ${28 * u}px rgba(0,0,0,0.3)` }}>
          <div style={{ ...text, color: shade(main, -0.3), textAlign: 'center', fontSize: size * 0.9 }}>{caption}</div>
        </div>
      );
    } else {
      tag = (
        <div style={{ position: 'absolute', right: -40 * u, bottom: (portrait ? 220 : 120) * u, maxWidth: (portrait ? 980 : 1300) * u, padding: `${22 * u}px ${90 * u}px ${22 * u}px ${60 * u}px`, background: accent, color: '#1b1b1b', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 6% 50%)', transform: `translateX(${interpolate(s, [0, 1], [900 * u, 0])}px)` }}>
          <div style={{ ...text, color: '#1b1b1b', fontSize: size * 0.9 }}>{caption}</div>
        </div>
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: shade(main, -0.35), overflow: 'hidden' }}>
      <DepthStage src={src} move={motion === 'auto' ? autoMotion(ordinal) : motion} layered={Boolean(src) && layeredFor(ordinal)} seed={ordinal}>
        {src ? (
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <AbsoluteFill style={{ background: `linear-gradient(135deg, ${shade(main, 0.1)}, ${shade(main, -0.35)})`, justifyContent: 'center', alignItems: 'center', padding: 120 * u, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: font, fontSize: 40 * u, lineHeight: 1.3 }}>
            {imagePrompt ? `🖼️ ${imagePrompt}` : 'Ảnh sẽ được tạo khi sản xuất'}
          </AbsoluteFill>
        )}
      </DepthStage>
      {fxKind !== 'none' ? <FxLayer kind={fxKind} accent={accent} /> : null}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)' }} />
      {tag}
    </AbsoluteFill>
  );
}
