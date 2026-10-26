// Draws a channel's intro/outro from its design (see src/core/domain/design.ts): background, then layers bottom to top.
// Positions are percentages of the frame, so one design serves 16:9 and 9:16 (each layer has both placements).
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BrandLogo, PatrickHandFamily, shade, useBrand, useLayout } from './primitives';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Anim = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'pop' | 'wipe' | 'type' | 'float' | 'pulse';
interface Placement {
  anim: Anim;
  delay: number;
  land: Frame;
  port: Frame;
}
export type DesignLayerSpec = Placement &
  (
    | { kind: 'text'; text: string; size: number; weight: '400' | '600' | '800'; color: string; font: 'brand' | 'mono' | 'serif' | 'hand' | 'impact'; upper: boolean; spacing: number; align: 'left' | 'center' | 'right' }
    | { kind: 'shape'; shape: 'rect' | 'ellipse' | 'line' | 'ring'; fill: string; opacity: number; radius: number; rotate: number }
    | { kind: 'logo'; circle: boolean }
    | { kind: 'avatar'; circle: boolean; ring: string }
    | { kind: 'art'; opacity: number }
    | { kind: 'subscribe'; fill: string; color: string; radius: number }
  );
export interface DesignSpec {
  background: { mode: 'solid' | 'linear' | 'radial'; colors: string[]; angle: number; texture: 'none' | 'grid' | 'dots' | 'lines' | 'paper' | 'noise'; vignette: boolean };
  layers: DesignLayerSpec[];
  artPrompt: string;
  seconds: number;
}

const imgSrc = (s: string) => (/^(data:|https?:|\/)/.test(s) ? s : staticFile(s));
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

function Background({ bg }: { bg: DesignSpec['background'] }) {
  const { width, height } = useLayout();
  const short = Math.min(width, height);
  const colors = bg.colors.length ? bg.colors : ['#4F46E5'];
  const c2 = colors.length > 1 ? colors : [colors[0]!, shade(colors[0]!, -0.2)];
  const base = bg.mode === 'solid' ? colors[0]! : bg.mode === 'radial' ? `radial-gradient(circle at 50% 40%, ${c2.join(', ')})` : `linear-gradient(${bg.angle}deg, ${c2.join(', ')})`;
  const cell = short / 12;
  const texture =
    bg.texture === 'grid' || bg.texture === 'paper'
      ? `repeating-linear-gradient(0deg, rgba(120,110,90,${bg.texture === 'paper' ? 0.16 : 0.1}) 0 2px, transparent 2px ${cell}px), repeating-linear-gradient(90deg, rgba(120,110,90,${bg.texture === 'paper' ? 0.16 : 0.1}) 0 2px, transparent 2px ${cell}px)`
      : bg.texture === 'dots'
        ? `radial-gradient(rgba(255,255,255,0.18) 14%, transparent 16%)`
        : bg.texture === 'lines'
          ? `repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0 ${cell / 4}px, transparent ${cell / 4}px ${cell / 2}px)`
          : undefined;
  return (
    <>
      <AbsoluteFill style={{ background: base }} />
      {texture ? <AbsoluteFill style={{ backgroundImage: texture, backgroundSize: bg.texture === 'dots' ? `${cell / 2}px ${cell / 2}px` : undefined }} /> : null}
      {bg.texture === 'paper' || bg.texture === 'noise' ? <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.2, mixBlendMode: 'multiply' }} /> : null}
      {bg.vignette ? <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(10,6,0,0.55) 100%)' }} /> : null}
    </>
  );
}

/** Entrance (and continuous motion) of one layer. */
function useAnim(anim: Anim, delaySec: number): { style: React.CSSProperties; progress: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const f = frame - Math.round(delaySec * fps);
  const soft = spring({ frame: f, fps, config: { damping: 18, stiffness: 100 } });
  const bouncy = spring({ frame: f, fps, config: { damping: 9, stiffness: 140 } });
  if (anim === 'none') return { style: {}, progress: 1 };
  if (f < 0) return { style: { opacity: 0 }, progress: 0 };
  const dist = 140 * u;
  switch (anim) {
    case 'slide-up':
      return { style: { opacity: soft, transform: `translateY(${(1 - soft) * dist}px)` }, progress: soft };
    case 'slide-down':
      return { style: { opacity: soft, transform: `translateY(${-(1 - soft) * dist}px)` }, progress: soft };
    case 'slide-left':
      return { style: { opacity: soft, transform: `translateX(${(1 - soft) * dist * 2}px)` }, progress: soft };
    case 'slide-right':
      return { style: { opacity: soft, transform: `translateX(${-(1 - soft) * dist * 2}px)` }, progress: soft };
    case 'pop':
      return { style: { opacity: Math.min(1, bouncy * 2), transform: `scale(${bouncy})` }, progress: bouncy };
    case 'wipe':
      return { style: { clipPath: `inset(-5% ${Math.max(0, (1 - soft) * 100)}% -5% 0)` }, progress: soft };
    case 'float':
      return { style: { opacity: soft, transform: `translateY(${Math.sin(f / 18) * 14 * u}px)` }, progress: soft };
    case 'pulse':
      return { style: { opacity: soft, transform: `scale(${1 + 0.05 * Math.sin(f / 8) * soft})` }, progress: soft };
    case 'type':
      return { style: {}, progress: Math.min(1, f / (fps * 1.2)) };
    default:
      return { style: { opacity: Math.min(1, f / 14) }, progress: Math.min(1, f / 14) };
  }
}

const FONTS: Record<string, string> = {
  mono: '"Courier New", ui-monospace, monospace',
  serif: 'Georgia, "Times New Roman", serif',
  impact: 'Impact, "Arial Black", sans-serif',
  hand: PatrickHandFamily,
};

function Layer({ layer, vars, art }: { layer: DesignLayerSpec; vars: { channel: string; title: string; outro: string; subscribe: string }; art: string | null }) {
  const brand = useBrand();
  const { portrait, width, height } = useLayout();
  const { style, progress } = useAnim(layer.anim, layer.delay);
  const f = portrait ? layer.port : layer.land;
  const px = { w: (f.w / 100) * width, h: (f.h / 100) * height };
  const short = Math.min(width, height);
  const box: React.CSSProperties = { position: 'absolute', left: `${f.x - f.w / 2}%`, top: `${f.y - f.h / 2}%`, width: `${f.w}%`, height: `${f.h}%`, display: 'flex', alignItems: 'center', ...style };
  const fill = (t: string) => t.replace(/\{(channel|title|outro|subscribe)\}/g, (_, k: keyof typeof vars) => vars[k]);

  switch (layer.kind) {
    case 'text': {
      let text = fill(layer.text);
      if (layer.anim === 'type') text = text.slice(0, Math.ceil(text.length * progress));
      return (
        <div style={{ ...box, justifyContent: layer.align === 'left' ? 'flex-start' : layer.align === 'right' ? 'flex-end' : 'center' }}>
          <div
            style={{
              fontFamily: layer.font === 'brand' ? brand.font : FONTS[layer.font],
              fontWeight: Number(layer.weight),
              fontSize: (layer.size / 100) * short,
              color: layer.color,
              textTransform: layer.upper ? 'uppercase' : undefined,
              letterSpacing: `${layer.spacing / 100}em`,
              lineHeight: 1.08,
              textAlign: layer.align,
              width: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {text}
          </div>
        </div>
      );
    }
    case 'shape': {
      const s: React.CSSProperties =
        layer.shape === 'ring'
          ? { border: `${Math.max(2, Math.min(px.w, px.h) * 0.06)}px solid ${layer.fill}`, borderRadius: '50%' }
          : { background: layer.fill, borderRadius: layer.shape === 'ellipse' ? '50%' : layer.shape === 'line' ? 999 : `${layer.radius}%` };
      return (
        <div style={{ ...box, opacity: (typeof style.opacity === 'number' ? style.opacity : 1) * layer.opacity }}>
          <div style={{ width: '100%', height: '100%', transform: `rotate(${layer.rotate}deg)`, ...s }} />
        </div>
      );
    }
    case 'logo':
      return (
        <div style={{ ...box, justifyContent: 'center' }}>
          <BrandLogo size={Math.min(px.w, px.h)} radius={layer.circle ? 9999 : Math.min(px.w, px.h) * 0.16} />
        </div>
      );
    case 'avatar':
      return brand.avatarSrc ? (
        <div style={{ ...box, justifyContent: 'center' }}>
          <Img src={imgSrc(brand.avatarSrc)} style={{ width: Math.min(px.w, px.h), height: Math.min(px.w, px.h), objectFit: 'cover', borderRadius: layer.circle ? '50%' : Math.min(px.w, px.h) * 0.12, border: layer.ring ? `${Math.min(px.w, px.h) * 0.03}px solid ${layer.ring}` : undefined, boxShadow: '0 24px 50px rgba(0,0,0,0.3)' }} />
        </div>
      ) : null;
    case 'art':
      return art ? (
        <div style={{ ...box, opacity: (typeof style.opacity === 'number' ? style.opacity : 1) * layer.opacity }}>
          <Img src={imgSrc(art)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : null;
    case 'subscribe':
      return vars.subscribe.trim() ? (
        <div style={{ ...box, justifyContent: 'center' }}>
          <div style={{ background: layer.fill, color: layer.color, borderRadius: `${layer.radius}%`, fontFamily: brand.font, fontWeight: 800, fontSize: Math.min(px.h * 0.46, px.w / Math.max(6, vars.subscribe.length) * 1.5), padding: '0 6%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', boxShadow: '0 14px 30px rgba(0,0,0,0.25)' }}>{vars.subscribe}</div>
        </div>
      ) : null;
  }
}

export function DesignScene({ design, kind, title }: { design: DesignSpec; kind: 'intro' | 'outro'; title: string }) {
  const brand = useBrand();
  const vars = { channel: brand.name, title, outro: brand.outroText, subscribe: brand.subscribeText };
  const art = (kind === 'intro' ? brand.introArtSrc : brand.outroArtSrc) ?? null;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Background bg={design.background} />
      {design.layers.map((l, i) => (
        <Layer key={i} layer={l} vars={vars} art={art} />
      ))}
    </AbsoluteFill>
  );
}
