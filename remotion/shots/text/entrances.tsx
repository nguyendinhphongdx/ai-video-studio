// Text shots where one phrase comes in. See common.tsx for the contract.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { inOut, outBack, outQuint, ramp, randAt, Row, wordStyle, type ShotProps, type TextShot } from './common';

const spr = (frame: number, delay: number, len = 16, easing = outQuint) => ramp(frame, delay, delay + len, easing);

function Rise({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const s = spr(frame, 6 + i * 5);
        return <span key={i} style={{ ...wordStyle(t, i === hot ? t.accent : undefined), opacity: s, transform: `translateY(${(1 - s) * 70 * t.u}px)` }}>{w}</span>;
      })}
    </Row>
  );
}

function BlurSlide({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const s = spr(frame, 6 + i * 4, 22);
        return <span key={i} style={{ ...wordStyle(t, i === hot ? t.accent : undefined), opacity: interpolate(s, [0, 0.6, 1], [0, 0.8, 1]), filter: `blur(${(1 - s) * 18 * t.u}px)`, transform: `translateY(${(1 - s) * 0.38 * t.size}px)` }}>{w}</span>;
      })}
    </Row>
  );
}

function ZoomAssemble({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const lead = ramp(frame, 4, 20, outBack);
  return (
    <Row t={t}>
      {words.map((w, i) => {
        if (i === hot) return <span key={i} style={{ ...wordStyle(t, t.accent), opacity: Math.min(1, lead * 3), transform: `scale(${3.2 - 2.2 * lead})` }}>{w}</span>;
        const s = spr(frame, 22 + (i < hot ? i : i - 1) * 4, 18);
        return <span key={i} style={{ ...wordStyle(t), opacity: s, transform: `scale(${0.88 + 0.12 * s})` }}>{w}</span>;
      })}
    </Row>
  );
}

function OutlineFill({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const start = 8 + i * 9;
        const fill = ramp(frame, start, start + 14) * 100;
        const color = i === hot ? t.accent : t.fg;
        return (
          <span key={i} style={{ ...wordStyle(t, 'transparent'), position: 'relative', WebkitTextStroke: `${3 * t.u}px ${color}`, opacity: ramp(frame, start - 6, start) }}>
            {w}
            <span style={{ position: 'absolute', left: 0, top: 0, color, WebkitTextStroke: '0', clipPath: `inset(0 ${100 - fill}% 0 0)` }}>{w}</span>
          </span>
        );
      })}
    </Row>
  );
}

function Typewriter({ text, words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.min(text.length, Math.floor((frame - 8) / 1.5)));
  const hotStart = words.slice(0, hot).join(' ').length + (hot ? 1 : 0);
  const hotEnd = hotStart + (words[hot]?.length ?? 0);
  const before = text.slice(0, shown);
  return (
    <div style={{ ...wordStyle(t), display: 'block', textAlign: 'center', whiteSpace: 'pre-wrap', maxWidth: (t.portrait ? 960 : 1560) * t.u }}>
      {before.slice(0, hotStart)}
      <span style={{ color: t.accent }}>{before.slice(hotStart, hotEnd)}</span>
      {before.slice(hotEnd)}
      <span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: t.accent }}>▌</span>
    </div>
  );
}

/** Each letter rises out of a mask under its word. */
function SplitStagger({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  let n = 0;
  return (
    <Row t={t}>
      {words.map((w, wi) => (
        <span key={wi} style={{ ...wordStyle(t, wi === hot ? t.accent : undefined), overflow: 'hidden', paddingBottom: t.size * 0.12 }}>
          {[...w].map((c, ci) => {
            const s = spr(frame, 4 + n++ * 1.6, 16);
            return <span key={ci} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 115}%)`, opacity: s > 0.02 ? 1 : 0 }}>{c}</span>;
          })}
        </span>
      ))}
    </Row>
  );
}

/** Letters fall from above, bounce and land crooked; then everyone stands up straight together. */
function LetterDrop({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const total = words.reduce((a, w) => a + w.length, 0);
  const stand = ramp(frame, 8 + total * 2 + 28, 8 + total * 2 + 44, inOut);
  let n = 0;
  return (
    <Row t={t}>
      {words.map((w, wi) => (
        <span key={wi} style={wordStyle(t, wi === hot ? t.accent : undefined)}>
          {[...w].map((c, ci) => {
            const idx = n++;
            const r = randAt(idx);
            const t0 = (frame - 6 - idx * 2) / 22;
            const u = Math.min(1, Math.max(0, t0));
            // y falls with gravity, then bounces twice with shrinking height.
            const fall = u < 0.55 ? 1 - (u / 0.55) ** 2 : u < 0.8 ? 0.22 * (1 - ((u - 0.55) / 0.25 - 0.5) ** 2 * 4 + 0) : u < 1 ? 0.06 * Math.sin(((u - 0.8) / 0.2) * Math.PI) : 0;
            const tilt = (r() - 0.5) * 36 * (1 - stand);
            return <span key={ci} style={{ display: 'inline-block', opacity: t0 > 0 ? 1 : 0, transform: `translateY(${-fall * 620 * t.u}px) rotate(${tilt}deg)` }}>{c}</span>;
          })}
        </span>
      ))}
    </Row>
  );
}

/** Letters drift in from scattered places and blur, and gather into the line. */
function LetterDrift({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  let n = 0;
  return (
    <Row t={t}>
      {words.map((w, wi) => (
        <span key={wi} style={wordStyle(t, wi === hot ? t.accent : undefined)}>
          {[...w].map((c, ci) => {
            const r = randAt(n++, 3);
            const s = ramp(frame, 4 + r() * 18, 52 + r() * 14, inOut);
            return <span key={ci} style={{ display: 'inline-block', opacity: Math.min(1, s * 2.4), filter: `blur(${(1 - s) * 12 * t.u}px)`, transform: `translate(${(r() - 0.5) * 520 * (1 - s) * t.u}px, ${(r() - 0.5) * 360 * (1 - s) * t.u}px) rotate(${(r() - 0.5) * 80 * (1 - s)}deg)` }}>{c}</span>;
          })}
        </span>
      ))}
    </Row>
  );
}

/** Letters flow in along a wave and settle onto the baseline; a word never breaks across lines. */
function TextOnPath({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  let n = 0;
  return (
    <Row t={t}>
      {words.map((w, wi) => (
        <span key={wi} style={{ ...wordStyle(t, wi === hot ? t.accent : undefined), whiteSpace: 'nowrap' }}>
          {[...w].map((c, ci) => {
            const i = n++;
            const s = ramp(frame, 4 + i * 1.4, 4 + i * 1.4 + 34, outQuint);
            return <span key={ci} style={{ display: 'inline-block', opacity: s, transform: `translate(${-(1 - s) * 520 * t.u}px, ${Math.sin(i * 0.55 + (1 - s) * 5) * 160 * (1 - s) * t.u}px) rotate(${(1 - s) * -18}deg)` }}>{c}</span>;
          })}
        </span>
      ))}
    </Row>
  );
}

/** Light paper card: the words are pressed onto the page one by one, one in italic accent, then a short rule. */
function PaperStamp({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const ink = '#2A2418';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 * t.u }}>
      <Row t={t}>
        {words.map((w, i) => {
          const s = ramp(frame, 6 + i * 7, 6 + i * 7 + 9, outBack);
          return <span key={i} style={{ ...wordStyle(t, i === hot ? t.accent : ink), fontStyle: i === hot ? 'italic' : 'normal', opacity: Math.min(1, s * 3), transform: `scale(${1.28 - 0.28 * s}) rotate(${(1 - s) * (i % 2 ? 2 : -2)}deg)`, textShadow: `0 ${2 * t.u}px 0 rgba(0,0,0,0.12)` }}>{w}</span>;
        })}
      </Row>
      <div style={{ width: 240 * t.u * ramp(frame, 12 + words.length * 7, 30 + words.length * 7, outQuint), height: 9 * t.u, background: t.accent, borderRadius: 9 * t.u }} />
    </div>
  );
}

/** A pair of braces appears in the middle, springs apart, and the text is revealed between them. */
function BraceExpand({ text, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const open = ramp(frame, 8, 34, outBack);
  const width = (text.length * t.size * 0.5) * open;
  const track = 1 - ramp(frame, 40, 70) * 0.04;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 * t.u }}>
      <span style={{ ...wordStyle(t, t.accent), fontSize: t.size * 1.25, opacity: ramp(frame, 0, 6) }}>{'{'}</span>
      <div style={{ ...wordStyle(t), display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', width: Math.min(width, (t.portrait ? 820 : 1380) * t.u), letterSpacing: `${(track - 1) * 30 - 1}px`, textAlign: 'center' }}>{text}</div>
      <span style={{ ...wordStyle(t, t.accent), fontSize: t.size * 1.25, opacity: ramp(frame, 0, 6) }}>{'}'}</span>
    </div>
  );
}

/** The phrase settles, then a marker line is drawn under the emphasised word. */
function MarkerUnderline({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const draw = ramp(frame, 8 + words.length * 4 + 12, 8 + words.length * 4 + 24, outQuint);
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const s = spr(frame, 6 + i * 4, 16);
        return (
          <span key={i} style={{ ...wordStyle(t), position: 'relative', opacity: s, transform: `translateY(${(1 - s) * 30 * t.u}px)`, fontStyle: i === hot ? 'italic' : 'normal' }}>
            {w}
            {i === hot ? <span style={{ position: 'absolute', left: -6 * t.u, right: -6 * t.u, bottom: t.size * 0.02, height: t.size * 0.17, background: t.accent, opacity: 0.88, borderRadius: `${t.size * 0.08}px ${t.size * 0.03}px ${t.size * 0.09}px ${t.size * 0.04}px`, transform: 'rotate(-1.4deg) skewX(-12deg)', clipPath: `inset(0 ${100 - draw * 100}% 0 0)`, mixBlendMode: 'screen' }} /> : null}
          </span>
        );
      })}
    </Row>
  );
}

/** The emphasised word is charged by a gradient sweep, then breathes with a glow. */
function GradientSweep({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const start = 8 + words.length * 3;
  const sweep = ramp(frame, start, start + 16, outQuint);
  const breathe = 0.6 + 0.4 * Math.sin(Math.max(0, frame - start - 16) / 9);
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const s = spr(frame, 4 + i * 3, 12);
        if (i !== hot) return <span key={i} style={{ ...wordStyle(t), opacity: s }}>{w}</span>;
        const pos = 100 - sweep * 150;
        return (
          <span key={i} style={{ ...wordStyle(t, 'transparent'), opacity: s, backgroundImage: `linear-gradient(100deg, ${t.fg} ${pos - 10}%, ${t.accent} ${pos + 10}%, #ffffff ${pos + 25}%, ${t.accent} ${pos + 45}%, ${t.main} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', textShadow: 'none', filter: sweep > 0.99 ? `drop-shadow(0 0 ${28 * breathe * t.u}px ${t.accent}aa)` : `drop-shadow(0 0 ${14 * t.u}px ${t.accent}66)` }}>{w}</span>
        );
      })}
    </Row>
  );
}

/** One word hero: a hollow word shrinks in, a dashed ring turns around it, then it lights up solid. */
function OutlineRing({ words, hot, text, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const hero = words[hot] ?? text;
  const shrink = ramp(frame, 0, 30, outQuint);
  const ring = ramp(frame, 14, 44, outQuint);
  const light = frame >= 48 ? 1 : 0;
  const glow = ramp(frame, 48, 60) * (1 - ramp(frame, 60, 74));
  const size = t.size * 1.5;
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: size * 3.3, height: size * 3.3, borderRadius: '50%', border: `${3 * t.u}px dashed ${t.accent}`, opacity: ring * 0.8, transform: `scale(${2.8 - 1.8 * ring}) rotate(${frame * 0.8}deg)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `${2 * t.u}px dashed ${t.fg}55`, transform: `scaleX(${ring})` }} />
      <span style={{ ...wordStyle(t, light ? t.fg : 'transparent'), fontSize: size, WebkitTextStroke: light ? '0' : `${3 * t.u}px ${t.fg}cc`, transform: `scale(${3.2 - 2.2 * shrink})`, opacity: shrink, textShadow: glow ? `0 0 ${60 * glow * t.u}px ${t.accent}` : undefined }}>{hero}</span>
    </div>
  );
}

/** A big title steps aside: it shrinks and slides to the top-left as a label, and lines grow in below. */
function TitleDemote({ text, items, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const show = ramp(frame, 0, 14, outQuint);
  const move = ramp(frame, 46, 86, inOut);
  const scale = 1 - 0.7 * move;
  const labelW = text.length * t.size * 0.5 * 0.3;
  const labelH = t.size * 1.12 * 0.3;
  // The title's centre travels from the middle of the frame to where the small label sits.
  const cx = width / 2 + (140 * t.u + labelW / 2 - width / 2) * move;
  const cy = height / 2 + (150 * t.u + labelH / 2 + 30 * t.u - height / 2) * move;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${scale})`, opacity: show, whiteSpace: 'nowrap', ...wordStyle(t) }}>{text}</div>
      <div style={{ position: 'absolute', left: 140 * t.u, top: 290 * t.u, display: 'flex', flexDirection: 'column', gap: 26 * t.u }}>
        {items.map((l, i) => {
          const s = ramp(frame, 66 + i * 8, 84 + i * 8, outQuint);
          return <div key={i} style={{ ...wordStyle(t), fontSize: t.size * 0.5, opacity: s, transform: `translateY(${(1 - s) * 30 * t.u}px)` }}>• {l}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
}

export const ENTRANCE_COMPONENTS: Record<string, TextShot['Component']> = {
  'rise': Rise,
  'blur-slide': BlurSlide,
  'zoom-assemble': ZoomAssemble,
  'outline-fill': OutlineFill,
  'typewriter': Typewriter,
  'split-stagger': SplitStagger,
  'letter-drop': LetterDrop,
  'letter-drift': LetterDrift,
  'text-on-path': TextOnPath,
  'paper-stamp': PaperStamp,
  'brace-expand': BraceExpand,
  'marker-underline': MarkerUnderline,
  'gradient-sweep': GradientSweep,
  'outline-ring': OutlineRing,
  'title-demote': TitleDemote,
};
