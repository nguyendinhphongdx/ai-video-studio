import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { useLayout } from '../primitives';

import { autoMotion, cornerFor, labelStyleFor, type Corner, type Motion } from './variants';

export interface VoxSceneProps {
  label: string;
  imagePrompt: string;
  motion: 'auto' | Motion;
  shot: 'auto' | 'wide' | 'close-up' | 'macro' | 'top-down' | 'low-angle' | 'diagonal' | 'left-third' | 'right-third' | 'split' | 'scale-contrast' | 'frame-in-frame' | 'cluster';
}

const PAPER = '#E8DFC8';
const MONO = '"Courier New", ui-monospace, monospace';

/** Camera move over the still: scale and drift for the whole scene, eased. */
export function camera(motion: Motion, t: number) {
  const e = t * t * (3 - 2 * t);
  switch (motion) {
    case 'zoom-out':
      return { scale: 1.16 - 0.12 * e, x: 0, y: 0 };
    case 'pan-left':
      return { scale: 1.12, x: 3 - 6 * e, y: 0 };
    case 'pan-right':
      return { scale: 1.12, x: -3 + 6 * e, y: 0 };
    case 'drift-up':
      return { scale: 1.1, x: 0, y: 2.5 - 5 * e };
    case 'drift-down':
      return { scale: 1.1, x: 0, y: -2.5 + 5 * e };
    default:
      return { scale: 1.02 + 0.12 * e, x: 0, y: -1 * e };
  }
}

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const TORN = 'polygon(0 4%, 3% 0, 7% 5%, 12% 0, 20% 4%, 30% 0, 41% 5%, 52% 0, 63% 4%, 74% 0, 85% 5%, 94% 0, 100% 4%, 100% 96%, 96% 100%, 88% 95%, 78% 100%, 66% 96%, 54% 100%, 42% 95%, 30% 100%, 18% 96%, 8% 100%, 0 95%)';

function place(corner: Corner, u: number, portrait: boolean): React.CSSProperties {
  const x = (portrait ? 70 : 150) * u;
  const y = (portrait ? 230 : 130) * u;
  const horizontal = corner.endsWith('right') ? { right: x } : { left: x };
  const vertical = corner.startsWith('top') ? { top: (portrait ? 170 : 110) * u } : { bottom: y };
  return { position: 'absolute', ...horizontal, ...vertical };
}

/** The caption sticker. Four looks (tape, highlighter, stamp, typed strip) so scenes do not all end with the same label. */
function Label({ text, ordinal }: { text: string; ordinal: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const style = labelStyleFor(ordinal);
  const corner = cornerFor(ordinal);
  const size = (text.length > 22 ? 62 : 84) * u;
  const base = place(corner, u, portrait);
  const maxWidth = (portrait ? 900 : 1100) * u;
  if (style === 'marker') {
    const wipe = interpolate(frame, [12, 30], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <div style={{ ...base, maxWidth, transform: 'rotate(-1.5deg)', clipPath: `inset(-10% ${100 - wipe}% -10% 0)` }}>
        <span style={{ display: 'inline', padding: `${6 * u}px ${24 * u}px`, background: '#FFE600', color: '#17140a', fontFamily: 'Impact, "Arial Black", sans-serif', fontWeight: 900, fontSize: size * 1.05, letterSpacing: 1 * u, textTransform: 'uppercase', lineHeight: 1.35, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', boxShadow: `0 ${8 * u}px ${18 * u}px rgba(0,0,0,0.3)` }}>{text}</span>
      </div>
    );
  }
  if (style === 'stamp') {
    const s = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 220 } });
    return (
      <div style={{ ...base, maxWidth, transform: `rotate(-8deg) scale(${interpolate(s, [0, 1], [2.2, 1])})`, opacity: interpolate(s, [0, 0.4, 1], [0, 0.9, 1]) }}>
        <div style={{ border: `${9 * u}px solid #C21F2B`, color: '#C21F2B', padding: `${14 * u}px ${38 * u}px`, fontFamily: 'Impact, "Arial Black", sans-serif', fontWeight: 900, fontSize: size * 1.05, letterSpacing: 5 * u, textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', mixBlendMode: 'multiply', borderRadius: 10 * u }}>{text}</div>
      </div>
    );
  }
  if (style === 'typed') {
    const shown = Math.max(0, Math.min(text.length, Math.floor((frame - 14) / 1.6)));
    return (
      <div style={{ ...base, maxWidth, background: '#15130e', color: '#F4EBD0', fontFamily: MONO, fontWeight: 700, fontSize: size * 0.78, letterSpacing: 2 * u, textTransform: 'uppercase', padding: `${18 * u}px ${34 * u}px`, boxShadow: `0 ${10 * u}px ${24 * u}px rgba(0,0,0,0.4)`, borderLeft: `${14 * u}px solid #FFE600` }}>
        {text.slice(0, shown)}
        <span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }}>▌</span>
      </div>
    );
  }
  const tapeIn = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div
      style={{
        ...base,
        maxWidth,
        padding: `${22 * u}px ${46 * u}px`,
        background: '#EFE3BF',
        color: '#2a2418',
        fontFamily: MONO,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 2 * u,
        textTransform: 'uppercase',
        lineHeight: 1.05,
        opacity: tapeIn,
        transform: `translateY(${interpolate(tapeIn, [0, 1], [90 * u, Math.sin(frame / 22) * 3 * u])}px) rotate(${interpolate(tapeIn, [0, 1], [6, -2])}deg)`,
        boxShadow: `0 ${10 * u}px ${24 * u}px rgba(0,0,0,0.35)`,
        clipPath: TORN,
      }}
    >
      {text}
    </div>
  );
}

/**
 * "Vox" explainer scene: an AI-made collage image (cut-out subject taped on paper) moved by the camera, with a
 * CRT scanline/vignette finish and a caption sticker. Camera move, sticker look and corner follow the scene's
 * ordinal unless the scene fixes its own motion. The image is added by the production pipeline.
 */
export function VoxScene({ label, imagePrompt, motion, image, ordinal = 1 }: VoxSceneProps & { image?: string; ordinal?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u } = useLayout();
  const cam = camera(motion === 'auto' ? autoMotion(ordinal) : motion, Math.min(1, frame / Math.max(1, durationInFrames)));
  const src = image ? (/^(data:|https?:|\/)/.test(image) ? image : staticFile(image)) : null;
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${cam.x}%, ${cam.y}%) scale(${cam.scale})` }}>
        {src ? (
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <AbsoluteFill
            style={{
              background: `repeating-linear-gradient(0deg, rgba(60,50,30,0.12) 0 2px, transparent 2px ${48 * u}px), repeating-linear-gradient(90deg, rgba(60,50,30,0.12) 0 2px, transparent 2px ${48 * u}px), ${PAPER}`,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 120 * u,
              textAlign: 'center',
              color: '#5b4f36',
              fontFamily: 'Georgia, serif',
              fontSize: 40 * u,
              lineHeight: 1.3,
            }}
          >
            {imagePrompt ? `🖼️ ${imagePrompt}` : 'Ảnh sẽ được tạo khi sản xuất'}
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0 2px, rgba(255,255,255,0.04) 2px 4px)', mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.22, mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 48%, rgba(20,12,0,0.62) 100%)' }} />

      {label ? <Label text={label} ordinal={ordinal} /> : null}
    </AbsoluteFill>
  );
}
