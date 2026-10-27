// Text shots that rotate through lines (`items`), run on the beat, or fly words past the camera.
// See common.tsx for the contract.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

import { mulberry32 } from '../../camera/noise';

import { inOut, itemsOf, outBack, outQuint, ramp, randAt, Row, stemOf, wordStyle, type ShotProps, type TextShot } from './common';

/** Frames each line stays: the scene is shared out between the lines, with a lead-in and a hold at the end. */
function useBeat(n: number, lead = 14, tail = 30): number {
  const { durationInFrames } = useVideoConfig();
  return Math.max(16, Math.floor((durationInFrames - lead - tail) / Math.max(1, n)));
}

const textWidth = (s: string, size: number) => s.length * size * 0.54;

/** A sentence stem with a pill at the end whose word rolls like a slot machine; the pill stretches to each word. */
function PillCycle(p: ShotProps & { chip: boolean }) {
  const frame = useCurrentFrame();
  const { chip } = p;
  // A slightly smaller type size keeps the stem and the pill on one line.
  const t = { ...p.theme, size: p.theme.size * 0.7 };
  const list = itemsOf(p);
  const beat = useBeat(list.length, 12, 26);
  const k = Math.min(list.length - 1, Math.max(0, Math.floor((frame - 12) / beat)));
  const local = frame - 12 - k * beat;
  const sw = k === 0 && frame < 12 ? 1 : ramp(local, 0, 14, outBack);
  const prev = Math.max(0, k - 1);
  const wPrev = textWidth(list[prev]!, t.size) + t.size * 0.8;
  const wNow = textWidth(list[k]!, t.size) + t.size * 0.8;
  const width = k === 0 ? wNow : wPrev + (wNow - wPrev) * sw;
  const h = t.size * 1.35;
  const pillBg = chip ? '#1d1a14' : t.accent;
  const pillFg = chip ? '#ffffff' : '#12100a';
  const ghosts = chip ? [list[k - 1], list[k + 1]] : [];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: t.size * 0.28, flexWrap: t.portrait ? 'wrap' : 'nowrap', justifyContent: 'center', maxWidth: (t.portrait ? 960 : 1800) * t.u }}>
      <span style={{ ...wordStyle(t, chip ? '#2a2418' : undefined), opacity: ramp(frame, 0, 12) }}>{stemOf(p)}</span>
      <div style={{ position: 'relative', width, height: h, borderRadius: h, background: pillBg, overflow: 'hidden', boxShadow: chip ? `0 ${8 * t.u}px ${24 * t.u}px rgba(0,0,0,0.22)` : undefined, opacity: ramp(frame, 4, 14) }}>
        {chip && ghosts[0] ? <span style={{ ...wordStyle(t, pillFg), position: 'absolute', left: 0, right: 0, top: -h * 0.9 + (1 - sw) * h, textAlign: 'center', opacity: 0.13, fontSize: t.size * 0.9 }}>{ghosts[0]}</span> : null}
        {list.map((item, i) => {
          if (i !== k && i !== prev) return null;
          const entering = i === k;
          const y = entering ? (1 - sw) * h : -sw * h * 1.1;
          const vis = entering ? sw : 1 - sw;
          return <span key={i} style={{ ...wordStyle(t, pillFg), position: 'absolute', left: 0, right: 0, top: (h - t.size * 1.12) / 2, textAlign: 'center', transform: `translateY(${k === 0 && frame < 12 + 14 ? (1 - sw) * h : y}px)`, opacity: k === 0 ? Math.max(sw, 0.0) : vis, filter: `blur(${(1 - vis) * 8 * t.u}px)` }}>{item}</span>;
        })}
        {chip && ghosts[1] ? <span style={{ ...wordStyle(t, pillFg), position: 'absolute', left: 0, right: 0, top: h * 0.92 - sw * h * 0.9 + (h - t.size) / 2, textAlign: 'center', opacity: 0.13, fontSize: t.size * 0.9 }}>{ghosts[1]}</span> : null}
      </div>
    </div>
  );
}

/** The last word of the sentence becomes a vertical wheel: neighbours blur and grey out, the chosen one turns accent. */
function VerticalRoll(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const list = itemsOf(p);
  const beat = useBeat(list.length, 16, 26);
  const lineH = t.size * 1.18;
  const pos = list.length > 1 ? Math.min(list.length - 1, Math.max(0, (frame - 16) / beat)) : 0;
  // Each step is a quick move that settles with a tiny overshoot.
  const base = Math.floor(pos);
  const eased = base + (pos - base < 1 ? outBack(Math.min(1, (pos - base) * 1.6)) : 1);
  const at = list.length > 1 ? Math.min(list.length - 1, eased) : 0;
  const cx = Math.round(at);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: t.size * 0.3, flexWrap: 'wrap', justifyContent: 'center' }}>
      <span style={wordStyle(t)}>{stemOf(p)}</span>
      <div style={{ position: 'relative', height: lineH * 3, minWidth: Math.max(...list.map((s) => textWidth(s, t.size))), overflow: 'hidden', maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)' }}>
        {list.map((item, i) => {
          const d = i - at;
          const focus = Math.abs(d) < 0.2 ? 1 : 0;
          return <span key={i} style={{ ...wordStyle(t, focus ? t.accent : `${t.fg}77`), position: 'absolute', left: 0, right: 0, top: lineH + d * lineH, textAlign: 'left', filter: `blur(${Math.min(7, Math.abs(d) * 5) * t.u}px)`, opacity: i === cx || Math.abs(d) < 1.6 ? 1 : 0 }}>{item}</span>;
        })}
      </div>
    </div>
  );
}

const GLYPHS = '#$%&@*<>/\\|[]{}=+-_~?!01';

/** One monospace line announcing a series of states; each swaps in through scrambled letters and an RGB split. */
function GlitchCycle(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const list = itemsOf(p).length > 1 ? itemsOf(p) : [p.text];
  const beat = useBeat(list.length, 6, 20);
  const k = Math.min(list.length - 1, Math.max(0, Math.floor((frame - 6) / beat)));
  const local = frame - 6 - k * beat;
  const last = k === list.length - 1;
  // Early in a line, and just before it ends, letters are scrambled with a probability that falls to zero for the last line.
  const chaos = last ? Math.max(0, 1 - local / 14) : Math.max(1 - local / 12, local > beat - 8 ? (local - (beat - 8)) / 8 : 0);
  const text = list[k]!;
  const r = randAt(frame, 5);
  const shown = [...text].map((c, i) => (c !== ' ' && r() < chaos * 0.85 ? GLYPHS[Math.floor(randAt(frame * 31 + i, 9)() * GLYPHS.length)]! : c)).join('');
  const split = chaos > 0.05 ? (2 + chaos * 7) * t.u : 0;
  return (
    <div style={{ ...wordStyle(t), fontFamily: '"Courier New", ui-monospace, monospace', fontWeight: 700, fontSize: t.size * 0.82, whiteSpace: 'pre', color: t.fg, textShadow: split ? `${split}px 0 #ff2a55, ${-split}px 0 #19d3ff` : undefined, transform: `translateX(${chaos > 0.2 ? (randAt(frame, 4)() - 0.5) * 18 * t.u * chaos : 0}px)` }}>
      {last ? <span style={{ color: t.accent }}>{'> '}</span> : <span style={{ opacity: 0.5 }}>{'> '}</span>}
      {shown}
    </div>
  );
}

/** A word on each side; the right one is swapped by hard cuts, then the pair slides together into the phrase. */
function ColumnConverge(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const left = p.words[0] ?? p.text;
  const list = itemsOf(p);
  const cut = 9;
  const swapped = Math.min(list.length - 1, Math.floor(Math.max(0, frame - 8) / cut));
  const spanEnd = 8 + list.length * cut;
  const merge = ramp(frame, spanEnd, spanEnd + 30, inOut);
  const now = list[swapped]!;
  const natural = textWidth(left, t.size) + textWidth(now, t.size) + t.size * 0.3;
  // The two words sit at the edges of a box that narrows to the phrase's own width, so they meet in the middle.
  const wide = (t.portrait ? 880 : 1500) * t.u;
  const width = wide + (Math.min(natural, wide) - wide) * merge;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: t.size * 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width, whiteSpace: 'nowrap' }}>
        <span style={wordStyle(t, t.accent)}>{left}</span>
        <span style={{ ...wordStyle(t), opacity: frame >= 8 ? 1 : 0 }}>{now}</span>
      </div>
      <span style={{ fontFamily: t.font, fontWeight: 700, fontSize: t.size * 0.3, color: `${t.fg}99`, opacity: ramp(frame, spanEnd + 24, spanEnd + 36) }}>{p.text.split(' ').slice(1).join(' ')}</span>
    </div>
  );
}

/** A stack of page cards steps down while one big phrase stays and its last word is swapped to match the focused card. */
function WordRelayFilmstrip(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const list = itemsOf(p);
  const beat = useBeat(list.length, 10, 24);
  const raw = Math.max(0, (frame - 10) / beat);
  const k = Math.min(list.length - 1, Math.floor(raw));
  const into = Math.min(1, (raw - Math.floor(raw)) * Math.min(beat / 12, 6));
  const pos = Math.min(list.length - 1, k + (k < list.length - 1 ? 0 : 0)) + 0;
  const slide = k === 0 && frame < 10 ? 0 : outQuint(into);
  const cardH = 190 * t.u;
  const cardW = (t.portrait ? 360 : 520) * t.u;
  const colors = [t.main, `${t.accent}`, `${t.fg}`, `${t.main}`];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 90 * t.u, flexDirection: t.portrait ? 'column' : 'row' }}>
      <div style={{ position: 'relative', width: cardW, height: cardH * 3.3, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)' }}>
        {list.map((item, i) => {
          const d = i - (pos > k ? pos : k - 1 + slide);
          const focus = Math.max(0, 1 - Math.abs(d));
          return <div key={i} style={{ position: 'absolute', left: 0, top: cardH * 1.15 + d * (cardH * 1.12), width: cardW, height: cardH, borderRadius: 18 * t.u, background: colors[i % colors.length], opacity: 0.35 + 0.65 * focus, transform: `scale(${0.86 + 0.14 * focus})`, boxShadow: `0 ${10 * t.u}px ${30 * t.u}px rgba(0,0,0,${0.15 + 0.25 * focus})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.font, fontWeight: 800, fontSize: 46 * t.u, color: i % 2 ? '#12100a' : '#fff' }}>{item}</div>;
        })}
      </div>
      <div style={{ ...wordStyle(t), display: 'flex', flexDirection: 'column', alignItems: t.portrait ? 'center' : 'flex-start' }}>
        <span>{stemOf(p)}</span>
        <span style={{ color: t.accent, fontStyle: 'italic', transform: `translateY(${(1 - ramp(frame - k * beat, 10, 10 + 12, outQuint)) * 30 * t.u}px)`, opacity: k === 0 && frame < 10 ? 0 : 1 }}>{list[k]}</span>
      </div>
    </div>
  );
}

/** Three words, each with its own geometry: a turning dashed ring, circles that grow and close, a bright sweep. */
function WordRelayGeometry(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const list = itemsOf(p).slice(0, 5);
  const beat = useBeat(list.length, 4, 12);
  const k = Math.min(list.length - 1, Math.floor(Math.max(0, frame - 4) / beat));
  const local = frame - 4 - k * beat;
  const reveal = ramp(local, 0, 18, outQuint);
  const size = t.size * 1.35;
  const R = size * 1.9;
  const kind = k % 3;
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: R * 2, height: R * 2 }}>
      <svg width={R * 2} height={R * 2} style={{ position: 'absolute', inset: 0, opacity: reveal }}>
        {kind === 0 ? (
          <>
            <circle cx={R} cy={R} r={R * 0.92} fill="none" stroke={t.accent} strokeWidth={3 * t.u} strokeDasharray={`${16 * t.u} ${14 * t.u}`} transform={`rotate(${local * 1.1} ${R} ${R})`} />
            <circle cx={R + R * 0.92 * Math.cos(local * 0.09)} cy={R + R * 0.92 * Math.sin(local * 0.09)} r={9 * t.u} fill={t.fg} />
          </>
        ) : null}
        {kind === 1
          ? [0, 1, 2].map((i) => <circle key={i} cx={R} cy={R} r={R * (0.55 + i * 0.16) * (1 - 0.06 * ramp(local, 30, 50, inOut))} fill="none" stroke={t.fg} strokeWidth={3 * t.u} strokeDasharray={Math.PI * 2 * R} strokeDashoffset={Math.PI * 2 * R * (1 - ramp(local, i * 8, i * 8 + 22, outQuint))} opacity={0.8} transform={`rotate(-90 ${R} ${R})`} />)
          : null}
      </svg>
      <span style={{ ...wordStyle(t, kind === 2 && local > 24 ? '#ffffff' : t.fg), fontSize: size, position: 'relative', opacity: reveal, transform: `scale(${0.86 + 0.14 * reveal})`, backgroundImage: kind === 2 ? `linear-gradient(105deg, ${t.fg} ${ramp(local, 10, 34) * 140 - 40}%, #ffffff ${ramp(local, 10, 34) * 140 - 20}%, ${t.accent} ${ramp(local, 10, 34) * 140}%, ${t.fg} 100%)` : undefined, WebkitBackgroundClip: kind === 2 ? 'text' : undefined, color: kind === 2 && local < 40 ? 'transparent' : undefined }}>{list[k]}</span>
    </div>
  );
}

/** A tentative word is typed, deleted, and replaced by the better one, faster. */
function TypeRetype(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const wrong = p.items[0] ?? 'ổn';
  const right = p.items[1] ?? p.words[p.hot] ?? p.text;
  const typeWrong = wrong.length * 3;
  const hold = 16;
  const del = Math.ceil(wrong.length * 1.4);
  const gap = 6;
  const t0 = 10;
  const shown = (() => {
    const f = frame - t0;
    if (f < 0) return '';
    if (f < typeWrong) return wrong.slice(0, Math.floor(f / 3));
    if (f < typeWrong + hold) return wrong;
    if (f < typeWrong + hold + del) return wrong.slice(0, wrong.length - Math.floor((f - typeWrong - hold) / 1.4));
    if (f < typeWrong + hold + del + gap) return '';
    return right.slice(0, Math.floor((f - typeWrong - hold - del - gap) / 1.6));
  })();
  const isRight = frame - t0 > typeWrong + hold + del + gap;
  return (
    <div style={{ ...wordStyle(t), display: 'block', textAlign: 'center', whiteSpace: 'pre-wrap', maxWidth: (t.portrait ? 960 : 1560) * t.u }}>
      {p.items.length ? p.text : p.words.slice(0, -1).join(' ')} <span style={{ color: isRight ? t.accent : `${t.fg}aa`, textDecoration: isRight ? 'none' : undefined }}>{shown}</span>
      <span style={{ opacity: Math.floor(frame / 7) % 2 ? 0 : 1, color: t.accent }}>▌</span>
    </div>
  );
}

/** Digits sit on a big arc; the dial sweeps, slows and stops with the number at the top, which becomes the title's first character. */
function CountdownArc(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const numeric = /^\d$/.test(p.words[0] ?? '') ? p.words[0]! : '5';
  const rest = /^\d$/.test(p.words[0] ?? '') ? p.words.slice(1) : p.words;
  const target = Number(numeric);
  const sweep = ramp(frame, 4, 34, (x) => 1 - (1 - x) ** 3);
  const rot = (1 - sweep) * 96;
  const settle = ramp(frame, 40, 60, inOut);
  const R = 620 * t.u;
  return (
    <div style={{ position: 'relative', width: 1700 * t.u, height: 520 * t.u }}>
      {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => {
        const ang = ((d - target) * 20 + rot) * (Math.PI / 180) - Math.PI / 2;
        const isTarget = d === target;
        const x = Math.cos(ang) * R;
        const y = Math.sin(ang) * R + R - 40 * t.u;
        const out = isTarget ? 0 : ramp(frame, 42, 58);
        const tx = isTarget ? x * (1 - settle) + (-(rest.join(' ').length * t.size * 0.27) - t.size * 0.3) * settle : x;
        const ty = isTarget ? y * (1 - settle) + (R * 0.0) * settle + (R - R) : y;
        return <span key={d} style={{ ...wordStyle(t, isTarget ? t.accent : t.fg), position: 'absolute', left: '50%', top: 0, fontSize: t.size * (isTarget ? 1.1 : 0.9), transform: `translate(${tx - t.size * 0.3}px, ${isTarget ? ty * (1 - settle) + 140 * t.u * settle : ty - 0}px)`, opacity: (1 - out) * (isTarget ? 1 : 0.8), filter: out ? `blur(${out * 12}px)` : undefined }}>{d}</span>;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 140 * t.u, textAlign: 'center' }}>
        <span style={{ ...wordStyle(t), opacity: ramp(frame, 50, 64), filter: `blur(${(1 - ramp(frame, 50, 66)) * 12}px)`, marginLeft: t.size * 0.9 }}>{rest.join(' ')}</span>
      </div>
    </div>
  );
}

/** Words light up one by one in step with the narration (spread evenly over the scene; each fills left to right). */
function KaraokeFill({ words, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = words.reduce((a, w) => a + w.length + 2, 0);
  const span = Math.max(30, durationInFrames - 34);
  let at = 10;
  return (
    <Row t={t}>
      {words.map((w, i) => {
        const start = at;
        const len = ((w.length + 2) / total) * span;
        at += len;
        const fill = ramp(frame, start, start + Math.max(6, len * 0.9)) * 100;
        return (
          <span key={i} style={{ ...wordStyle(t, `${t.fg}44`), position: 'relative' }}>
            {w}
            <span style={{ position: 'absolute', left: 0, top: 0, color: t.accent, clipPath: `inset(0 ${100 - fill}% 0 0)`, textShadow: fill > 0 && fill < 100 ? `0 0 ${24 * t.u}px ${t.accent}88` : undefined }}>{w}</span>
          </span>
        );
      })}
    </Row>
  );
}

/** Stroke weight and size pulse on a steady beat (about 128 bpm), then settle back; words are already in place. */
function WeightPump({ words, hot, theme: t }: ShotProps) {
  const frame = useCurrentFrame();
  const period = 14;
  const since = (frame - 8) % period;
  const beat = frame < 8 ? 0 : Math.exp(-since / 4);
  return (
    <Row t={t}>
      {words.map((w, i) => (
        <span key={i} style={{ ...wordStyle(t, i === hot ? t.accent : undefined), fontWeight: Math.round(520 + 280 * beat), transform: `scale(${1 + 0.05 * beat})`, opacity: ramp(frame, 0, 8) }}>{w}</span>
      ))}
    </Row>
  );
}

/** Words fly along the depth axis past the camera, laid out on a flat ellipse at the golden angle; the sentence rests in the middle. */
function FlyingWords(p: ShotProps) {
  const frame = useCurrentFrame();
  const { theme: t } = p;
  const pool = p.items.length ? p.items : p.words;
  const count = 22;
  const rand = mulberry32(7);
  return (
    <AbsoluteFill style={{ perspective: `${900 * t.u}px`, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: count }, (_, i) => {
        const ang = i * 2.399963;
        const phase = (i / count + frame / 120) % 1;
        const z = -1800 + phase * 2400;
        const life = phase < 0.1 ? phase / 0.1 : phase > 0.8 ? 1 - (phase - 0.8) / 0.2 : 1;
        const jitter = 0.7 + rand() * 0.5;
        return <span key={i} style={{ ...wordStyle(t, i % 5 === 0 ? t.accent : `${t.fg}cc`), position: 'absolute', fontSize: t.size * 0.55, transform: `translate3d(${Math.cos(ang) * 780 * jitter * t.u}px, ${Math.sin(ang) * 330 * jitter * t.u}px, ${z}px)`, opacity: Math.max(0, life) * 0.7, whiteSpace: 'nowrap' }}>{pool[i % pool.length]}</span>;
      })}
      <div style={{ position: 'relative', maxWidth: (t.portrait ? 900 : 1300) * t.u, textAlign: 'center', ...wordStyle(t), display: 'block', fontSize: t.size * 0.9, textShadow: `0 0 ${40 * t.u}px rgba(0,0,0,0.6)`, opacity: ramp(frame, 6, 24) }}>{p.text}</div>
    </AbsoluteFill>
  );
}

export const CYCLE_COMPONENTS: Record<string, TextShot['Component']> = {
  'pill-slot': (p) => <PillCycle {...p} chip={false} />,
  'pill-chip': (p) => <PillCycle {...p} chip />,
  'vertical-roll': VerticalRoll,
  'glitch-cycle': GlitchCycle,
  'column-converge': ColumnConverge,
  'relay-filmstrip': WordRelayFilmstrip,
  'relay-geometry': WordRelayGeometry,
  'type-retype': TypeRetype,
  'countdown-arc': CountdownArc,
  'karaoke-fill': KaraokeFill,
  'weight-pump': WeightPump,
  'flying-words': FlyingWords,
};
