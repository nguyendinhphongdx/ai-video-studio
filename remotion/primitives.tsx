// Building blocks shared by the scene components. Rendered both by the worker (headless) and by
// @remotion/player in the storyboard, so everything here must work in a plain browser.
import { loadFont } from '@remotion/fonts';
import { createContext, useContext, type ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const ROUND = 'Baloo2';
export const HAND = 'PatrickHand';
export const INK = '#2B2B2B';
export const OUTLINE = '#1E3A6B';

let fontsLoaded = false;
export function ensureFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  void loadFont({ family: ROUND, url: staticFile('fonts/Baloo2.ttf'), weight: '400 800' });
  void loadFont({ family: HAND, url: staticFile('fonts/PatrickHand-Regular.ttf') });
}

export interface SceneBrand {
  name: string;
  logoSrc: string | null;
  outroText: string;
  subscribeText: string;
  palette: string[];
}

export const BrandContext = createContext<SceneBrand>({ name: '', logoSrc: null, outroText: '', subscribeText: '', palette: [] });
export const useBrand = () => useContext(BrandContext);

/** Sizes are designed on a 1080px short side; `u` scales them to any format. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  return { u: Math.min(width, height) / 1080, portrait: height > width, width, height };
}

export const outline = (color: string, w: number) =>
  `-${w}px -${w}px 0 ${color}, ${w}px -${w}px 0 ${color}, -${w}px ${w}px 0 ${color}, ${w}px ${w}px 0 ${color}, 0 ${w + 6}px 0 rgba(0,0,0,0.18)`;

export const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};

export const progress = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });

export const headingSize = (text: string) => {
  const len = [...text].length;
  return len <= 2 ? 380 : len <= 4 ? 250 : len <= 7 ? 170 : 120;
};

export const emojiSize = (count: number) => (count <= 1 ? 300 : count <= 3 ? 210 : count <= 6 ? 160 : 120);

/** Soft fade in/out over a scene's first and last frames. */
export function SceneFade({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const end = durationInFrames;
  const opacity = interpolate(frame, [0, 8, end - 8, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function Sparkles() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: (i * 263 + 120) % width,
            top: (i * 151 + 60) % height,
            fontSize: 50,
            opacity: 0.7,
            transform: `scale(${0.6 + 0.4 * Math.sin(frame / 10 + i)})`,
          }}
        >
          ✨
        </div>
      ))}
    </>
  );
}

export function Sky({ color = '#4FC3F7', children }: { color?: string; children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${shade(color, 0.15)}, ${shade(color, -0.15)})`, fontFamily: ROUND, overflow: 'hidden' }}>
      <Sparkles />
      {children}
    </AbsoluteFill>
  );
}

export function Board({ children }: { children?: ReactNode }) {
  return <AbsoluteFill style={{ background: '#FDFDFB', fontFamily: HAND, overflow: 'hidden' }}>{children}</AbsoluteFill>;
}

function Pen({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" style={{ position: 'absolute', left: 0, top: -size, overflow: 'visible', pointerEvents: 'none' }}>
      <g transform="rotate(-35 0 220)">
        <polygon points="0,220 14,196 26,196" fill={INK} />
        <rect x={10} y={110} width={20} height={86} rx={3} fill="#E53935" />
        <rect x={8} y={20} width={24} height={95} rx={6} fill="#F5F5F5" stroke="#999" strokeWidth={2} />
        <rect x={8} y={20} width={24} height={22} rx={6} fill="#E53935" />
      </g>
    </svg>
  );
}

export { Pen };

/** Handwritten text revealed left to right, with a pen following the edge. */
export function Written({ text, p, size, color = INK }: { text: string; p: number; size: number; color?: string }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ fontFamily: HAND, fontSize: size, color, whiteSpace: 'nowrap', lineHeight: 1.2, clipPath: `inset(-20% ${100 - p * 100}% -20% 0)` }}>{text}</div>
      {p > 0 && p < 1 ? (
        <div style={{ position: 'absolute', left: `${p * 100}%`, top: size * 0.85 + Math.sin(frame * 1.7) * size * 0.15 }}>
          <Pen size={size * 1.6} />
        </div>
      ) : null}
    </div>
  );
}

/** Channel logo, or the channel name in a rounded badge when no logo was uploaded. */
export function BrandLogo({ size, radius, style }: { size: number; radius: number; style?: React.CSSProperties }) {
  const brand = useBrand();
  if (brand.logoSrc) {
    const src = /^(data:|https?:|\/)/.test(brand.logoSrc) ? brand.logoSrc : staticFile(brand.logoSrc);
    return <Img src={src} style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius, ...style }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: brand.palette[0] ?? '#5B3DF5',
        color: '#fff',
        fontFamily: ROUND,
        fontWeight: 800,
        fontSize: size * 0.18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: size * 0.08,
        ...style,
      }}
    >
      {brand.name}
    </div>
  );
}
