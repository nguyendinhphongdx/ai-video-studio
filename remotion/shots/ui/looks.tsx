// Drawing of the software-window looks. Everything is a pure function of the frame (seeded randomness only). Each look
// draws inside the window's content area, `w` by `h` design pixels (already scaled by `u`).
import type { CSSProperties, ReactNode } from 'react';
import { interpolate } from 'remotion';

import { mulberry32 } from '../../camera/noise';

import type { UiLookId } from './meta';

export interface UiCtx {
  frame: number;
  u: number;
  w: number;
  h: number;
  portrait: boolean;
  main: string;
  accent: string;
  title: string;
  items: string[];
  /** Index into items the cursor goes to. */
  target: number;
}

/** Frame at which the cursor clicks in the looks that click. */
export const CLICK_FRAME = 54;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const spring = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(9 * t));
export const prog = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp });

const card = (u: number, accent?: string): CSSProperties => ({ background: 'rgba(255,255,255,0.09)', border: `${2 * u}px solid ${accent ?? 'rgba(255,255,255,0.16)'}`, borderRadius: 22 * u, color: 'white', fontWeight: 700, boxSizing: 'border-box' });

function Cursor({ c, from, to, start = 6 }: { c: UiCtx; from: [number, number]; to: [number, number]; start?: number }) {
  const t = easeOut(prog(c.frame, start, CLICK_FRAME - 4));
  // A slight arc, so the cursor does not slide on rails.
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 40 * c.u;
  const ring = prog(c.frame, CLICK_FRAME, CLICK_FRAME + 16);
  const press = c.frame >= CLICK_FRAME && c.frame < CLICK_FRAME + 5 ? 0.86 : 1;
  return (
    <>
      {ring > 0 && ring < 1 ? <div style={{ position: 'absolute', left: to[0] - 50 * c.u * ring, top: to[1] - 50 * c.u * ring, width: 100 * c.u * ring, height: 100 * c.u * ring, borderRadius: '50%', border: `${4 * c.u}px solid ${c.accent}`, opacity: 1 - ring }} /> : null}
      <svg width={44 * c.u} height={60 * c.u} viewBox="0 0 28 44" style={{ position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: '0 0', filter: `drop-shadow(0 ${4 * c.u}px ${6 * c.u}px rgba(0,0,0,0.5))`, zIndex: 5 }}>
        <path d="M2 2 L2 34 L10 27 L16 41 L22 38 L16 25 L26 25 Z" fill="white" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </>
  );
}

/** Row geometry shared by the list looks. */
function rowBox(c: UiCtx, i: number, n: number, width = c.w - 120 * c.u) {
  const rowH = Math.min(120 * c.u, (c.h - 100 * c.u) / n - 14 * c.u);
  return { x: 60 * c.u, y: 50 * c.u + i * (rowH + 14 * c.u), w: width, h: rowH };
}

const label = (c: UiCtx, i: number) => c.items[i] ?? `Mục ${i + 1}`;
const fontFor = (c: UiCtx, k = 1) => 40 * c.u * k;

function cardsFly(c: UiCtx): ReactNode {
  const n = c.items.length;
  const cols = c.portrait ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 24 * c.u;
  const cw = (c.w - 120 * c.u - gap * (cols - 1)) / cols;
  const ch = Math.min(200 * c.u, (c.h - 100 * c.u - gap * (rows - 1)) / rows);
  const rand = mulberry32(11);
  return c.items.map((it, i) => {
    const gx = 60 * c.u + (i % cols) * (cw + gap);
    const gy = 50 * c.u + Math.floor(i / cols) * (ch + gap);
    const ang = rand() * Math.PI * 2;
    const t = spring(prog(c.frame, 4 + i * 6, 30 + i * 6));
    const rot = (1 - t) * (rand() - 0.5) * 50;
    return (
      <div key={i} style={{ ...card(c.u, i === n - 1 ? c.accent : undefined), position: 'absolute', left: gx + Math.cos(ang) * 1500 * c.u * (1 - t), top: gy + Math.sin(ang) * 900 * c.u * (1 - t), width: cw, height: ch, transform: `rotate(${rot}deg)`, opacity: Math.min(1, t * 3), display: 'flex', alignItems: 'center', padding: `0 ${28 * c.u}px`, fontSize: fontFor(c) }}>
        {it}
      </div>
    );
  });
}

function rowsCascade(c: UiCtx): ReactNode {
  const n = c.items.length;
  const glow = prog(c.frame, 20 + n * 7 + 6, 20 + n * 7 + 22);
  return c.items.map((it, i) => {
    const b = rowBox(c, i, n);
    const t = easeOut(prog(c.frame, 4 + i * 7, 22 + i * 7));
    const last = i === n - 1;
    return (
      <div key={i} style={{ ...card(c.u, last && glow > 0 ? c.accent : undefined), position: 'absolute', left: b.x + (1 - t) * -c.w * 0.6, top: b.y, width: b.w, height: b.h, opacity: t, display: 'flex', alignItems: 'center', gap: 24 * c.u, padding: `0 ${28 * c.u}px`, fontSize: fontFor(c), background: last && glow > 0 ? `rgba(255,255,255,${0.09 + 0.14 * glow})` : card(c.u).background }}>
        <span style={{ width: 16 * c.u, height: 16 * c.u, borderRadius: '50%', background: c.accent, flexShrink: 0 }} />
        {it}
      </div>
    );
  });
}

function stackFan(c: UiCtx): ReactNode {
  const n = c.items.length;
  const k = easeOut(prog(c.frame, 28, 62));
  const intro = spring(prog(c.frame, 2, 24));
  const cw = Math.min(520 * c.u, c.w * 0.5);
  const ch = Math.min(300 * c.u, c.h * 0.5);
  return c.items.map((it, i) => {
    const mid = (n - 1) / 2;
    const spread = (i - mid) * (c.portrait ? cw * 0.18 : cw * 0.5) * k;
    const lift = i * -6 * c.u * (1 - k);
    return (
      <div key={i} style={{ ...card(c.u, i === n - 1 ? c.accent : undefined), position: 'absolute', left: c.w / 2 - cw / 2 + spread, top: c.h / 2 - ch / 2 + lift + (1 - intro) * 500 * c.u + Math.abs(i - mid) * 14 * c.u * k, width: cw, height: ch, transform: `rotate(${(i - mid) * 9 * k + (i - mid) * 1.5 * (1 - k)}deg)`, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 * c.u, fontSize: fontFor(c, 1.1), zIndex: i, background: `rgb(${30 + i * 10}, ${34 + i * 8}, ${52 + i * 10})` }}>
        {it}
      </div>
    );
  });
}

function clickSelect(c: UiCtx): ReactNode {
  const n = c.items.length;
  const listW = c.portrait ? c.w - 120 * c.u : (c.w - 120 * c.u) * 0.5;
  const sel = c.frame >= CLICK_FRAME;
  const detail = easeOut(prog(c.frame, CLICK_FRAME + 2, CLICK_FRAME + 22));
  const tb = rowBox({ ...c, h: c.portrait ? c.h * 0.55 : c.h }, c.target, n, listW);
  return (
    <>
      {c.items.map((it, i) => {
        const b = rowBox({ ...c, h: c.portrait ? c.h * 0.55 : c.h }, i, n, listW);
        const on = sel && i === c.target;
        const t = easeOut(prog(c.frame, 2 + i * 4, 18 + i * 4));
        return (
          <div key={i} style={{ ...card(c.u, on ? c.accent : undefined), position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, opacity: t, display: 'flex', alignItems: 'center', padding: `0 ${26 * c.u}px`, fontSize: fontFor(c, 0.9), background: on ? c.accent : card(c.u).background, color: on ? '#111' : 'white' }}>
            {it}
          </div>
        );
      })}
      <div style={{ ...card(c.u), position: 'absolute', left: c.portrait ? 60 * c.u : 60 * c.u + listW + 30 * c.u, top: c.portrait ? c.h * 0.6 : 50 * c.u, width: c.portrait ? c.w - 120 * c.u : c.w - 150 * c.u - listW, height: c.portrait ? c.h * 0.34 : c.h - 100 * c.u, opacity: detail, transform: `translateY(${(1 - detail) * 30 * c.u}px)`, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 * c.u }}>
        <div>
          <div style={{ fontSize: 64 * c.u, color: c.accent, lineHeight: 1.1 }}>{label(c, c.target)}</div>
          <div style={{ marginTop: 14 * c.u, fontSize: 30 * c.u, fontWeight: 600, opacity: 0.7 }}>{c.title}</div>
        </div>
      </div>
      <Cursor c={c} from={[c.w * 0.85, c.h * 0.9]} to={[tb.x + tb.w * 0.55, tb.y + tb.h * 0.55]} />
    </>
  );
}

function chipFilter(c: UiCtx): ReactNode {
  const n = c.items.length;
  const chipH = 74 * c.u;
  const chipW = Math.min(300 * c.u, (c.w - 120 * c.u - 16 * c.u * (n - 1)) / n);
  const sel = c.frame >= CLICK_FRAME;
  const cards = 8;
  const gridCols = c.portrait ? 2 : 4;
  const cw = (c.w - 120 * c.u - 20 * c.u * (gridCols - 1)) / gridCols;
  const ch = Math.min(180 * c.u, (c.h - 220 * c.u) / Math.ceil(cards / gridCols) - 20 * c.u);
  const hide = easeOut(prog(c.frame, CLICK_FRAME + 2, CLICK_FRAME + 24));
  const tx = 60 * c.u + c.target * (chipW + 16 * c.u);
  return (
    <>
      {c.items.map((it, i) => (
        <div key={i} style={{ ...card(c.u, sel && i === c.target ? c.accent : undefined), position: 'absolute', left: 60 * c.u + i * (chipW + 16 * c.u), top: 40 * c.u, width: chipW, height: chipH, borderRadius: chipH / 2, display: 'grid', placeItems: 'center', fontSize: 28 * c.u, opacity: easeOut(prog(c.frame, 2 + i * 3, 14 + i * 3)), background: sel && i === c.target ? c.accent : card(c.u).background, color: sel && i === c.target ? '#111' : 'white', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {it}
        </div>
      ))}
      {Array.from({ length: cards }, (_, i) => {
        const keep = i % n === c.target;
        const t = easeOut(prog(c.frame, 10 + i * 3, 28 + i * 3));
        const s = keep ? 1 : 1 - 0.55 * hide;
        return <div key={i} style={{ ...card(c.u, keep && sel ? c.accent : undefined), position: 'absolute', left: 60 * c.u + (i % gridCols) * (cw + 20 * c.u), top: 150 * c.u + Math.floor(i / gridCols) * (ch + 20 * c.u), width: cw, height: ch, opacity: t * (keep ? 1 : 1 - 0.75 * hide), transform: `scale(${s})`, display: 'grid', placeItems: 'center', fontSize: 26 * c.u, background: keep && sel ? 'rgba(255,255,255,0.2)' : card(c.u).background }}>{label(c, i % n)}</div>;
      })}
      <Cursor c={c} from={[c.w * 0.8, c.h * 0.85]} to={[tx + chipW * 0.5, 40 * c.u + chipH / 2]} />
    </>
  );
}

function toggleSwitch(c: UiCtx): ReactNode {
  const n = c.items.length;
  const flip = easeOut(prog(c.frame, CLICK_FRAME, CLICK_FRAME + 12));
  const tb = rowBox(c, c.target, n);
  const tw = 120 * c.u;
  return (
    <>
      {c.items.map((it, i) => {
        const b = rowBox(c, i, n);
        const t = easeOut(prog(c.frame, 2 + i * 5, 18 + i * 5));
        const on = i === c.target ? flip : i < c.target ? 1 : 0;
        return (
          <div key={i} style={{ ...card(c.u), position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, opacity: t, display: 'flex', alignItems: 'center', padding: `0 ${28 * c.u}px`, fontSize: fontFor(c, 0.9) }}>
            <span style={{ flex: 1 }}>{it}</span>
            <span style={{ width: tw, height: tw * 0.52, borderRadius: tw, background: on > 0.5 ? c.accent : 'rgba(255,255,255,0.22)', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: tw * 0.05, left: tw * 0.05 + on * tw * 0.48, width: tw * 0.42, height: tw * 0.42, borderRadius: '50%', background: 'white' }} />
            </span>
          </div>
        );
      })}
      <Cursor c={c} from={[c.w * 0.5, c.h * 0.95]} to={[tb.x + tb.w - 28 * c.u - tw * 0.5, tb.y + tb.h / 2]} />
    </>
  );
}

function typeSearch(c: UiCtx): ReactNode {
  const chars = [...c.title];
  const shown = Math.floor(interpolate(c.frame, [8, 8 + Math.min(40, chars.length * 2)], [0, chars.length], clamp));
  const typed = chars.slice(0, shown).join('');
  const done = 8 + Math.min(40, chars.length * 2) + 8;
  const barH = 96 * c.u;
  const n = c.items.length;
  return (
    <>
      <div style={{ ...card(c.u, c.accent), position: 'absolute', left: 60 * c.u, top: 40 * c.u, width: c.w - 120 * c.u, height: barH, borderRadius: barH / 2, display: 'flex', alignItems: 'center', padding: `0 ${36 * c.u}px`, fontSize: 38 * c.u, gap: 18 * c.u }}>
        <span style={{ opacity: 0.6 }}>⌕</span>
        <span>{typed}</span>
        {Math.floor(c.frame / 8) % 2 === 0 ? <span style={{ width: 3 * c.u, height: 44 * c.u, background: c.accent }} /> : null}
      </div>
      {c.items.map((it, i) => {
        const rowH = Math.min(110 * c.u, (c.h - 220 * c.u) / n - 14 * c.u);
        const t = easeOut(prog(c.frame, done + i * 6, done + 16 + i * 6));
        return (
          <div key={i} style={{ ...card(c.u, i === 0 && t > 0.9 ? c.accent : undefined), position: 'absolute', left: 60 * c.u, top: 40 * c.u + barH + 30 * c.u + i * (rowH + 14 * c.u) + (1 - t) * 30 * c.u, width: c.w - 120 * c.u, height: rowH, opacity: t, display: 'flex', alignItems: 'center', padding: `0 ${28 * c.u}px`, fontSize: fontFor(c, 0.9) }}>
            {it}
          </div>
        );
      })}
    </>
  );
}

function notifyStack(c: UiCtx): ReactNode {
  const n = c.items.length;
  const cw = Math.min(900 * c.u, c.w - 120 * c.u);
  const ch = Math.min(120 * c.u, (c.h - 100 * c.u) / n - 16 * c.u);
  return c.items.map((it, i) => {
    const t = spring(prog(c.frame, 6 + i * 10, 24 + i * 10));
    return (
      <div key={i} style={{ ...card(c.u, i === n - 1 ? c.accent : undefined), position: 'absolute', left: c.w - cw - 60 * c.u + (1 - t) * 500 * c.u, top: 40 * c.u + i * (ch + 16 * c.u), width: cw, height: ch, opacity: Math.min(1, t * 2), display: 'flex', alignItems: 'center', gap: 22 * c.u, padding: `0 ${28 * c.u}px`, fontSize: fontFor(c, 0.85), background: 'rgba(20,24,40,0.92)', boxShadow: `0 ${14 * c.u}px ${30 * c.u}px rgba(0,0,0,0.4)`, transform: `scale(${0.9 + 0.1 * t})` }}>
        <span style={{ width: 28 * c.u, height: 28 * c.u, borderRadius: '50%', background: c.accent, flexShrink: 0 }} />
        {it}
      </div>
    );
  });
}

function tabSwitch(c: UiCtx): ReactNode {
  const n = c.items.length;
  const tabW = (c.w - 120 * c.u) / n;
  const move = easeOut(prog(c.frame, CLICK_FRAME, CLICK_FRAME + 14));
  const at = 0 + (c.target - 0) * move;
  const bodyT = easeOut(prog(c.frame, CLICK_FRAME + 4, CLICK_FRAME + 24));
  return (
    <>
      {c.items.map((it, i) => (
        <div key={i} style={{ position: 'absolute', left: 60 * c.u + i * tabW, top: 40 * c.u, width: tabW, height: 90 * c.u, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 32 * c.u, opacity: (i === c.target ? 0.55 + 0.45 * move : i === 0 ? 1 - 0.45 * move : 0.55) * easeOut(prog(c.frame, 2 + i * 3, 14 + i * 3)), whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {it}
        </div>
      ))}
      <div style={{ position: 'absolute', left: 60 * c.u + at * tabW + 16 * c.u, top: 40 * c.u + 90 * c.u, width: tabW - 32 * c.u, height: 7 * c.u, borderRadius: 4 * c.u, background: c.accent }} />
      <div style={{ position: 'absolute', left: 60 * c.u, right: 60 * c.u, top: 40 * c.u + 90 * c.u + 7 * c.u, height: 2 * c.u, background: 'rgba(255,255,255,0.14)' }} />
      <div style={{ ...card(c.u), position: 'absolute', left: 60 * c.u, top: 190 * c.u, width: c.w - 120 * c.u, height: c.h - 250 * c.u, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 40 * c.u }}>
        <div style={{ opacity: c.frame < CLICK_FRAME ? 1 - 0.3 : bodyT, transform: `translateY(${(c.frame < CLICK_FRAME ? 0 : 1 - bodyT) * 24 * c.u}px)` }}>
          <div style={{ fontSize: 72 * c.u, color: c.frame < CLICK_FRAME ? 'white' : c.accent, lineHeight: 1.1 }}>{label(c, c.frame < CLICK_FRAME ? 0 : c.target)}</div>
          <div style={{ marginTop: 14 * c.u, fontSize: 30 * c.u, fontWeight: 600, opacity: 0.7 }}>{c.title}</div>
        </div>
      </div>
      <Cursor c={c} from={[c.w * 0.9, c.h * 0.85]} to={[60 * c.u + c.target * tabW + tabW / 2, 40 * c.u + 45 * c.u]} />
    </>
  );
}

function progressDone(c: UiCtx): ReactNode {
  const n = c.items.length;
  const fill = easeOut(prog(c.frame, 8, 84));
  const done = spring(prog(c.frame, 88, 106));
  const barW = c.w - 160 * c.u;
  const barH = 40 * c.u;
  const listTop = 40 * c.u + 130 * c.u + barH + 50 * c.u;
  const rowH = Math.min(86 * c.u, (c.h - listTop - 30 * c.u) / n - 10 * c.u);
  return (
    <>
      <div style={{ position: 'absolute', left: 80 * c.u, top: 40 * c.u, width: barW, color: 'white', fontWeight: 800, fontSize: 52 * c.u, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{c.title}</span>
        <span style={{ color: c.accent }}>{done > 0.05 ? '✓' : `${Math.round(fill * 100)}%`}</span>
      </div>
      <div style={{ position: 'absolute', left: 80 * c.u, top: 40 * c.u + 110 * c.u, width: barW, height: barH, borderRadius: barH, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
        <div style={{ width: `${fill * 100}%`, height: '100%', borderRadius: barH, background: `linear-gradient(90deg, ${c.accent}, #fff)` }} />
      </div>
      {c.items.map((it, i) => {
        const hit = fill >= (i + 1) / n;
        return (
          <div key={i} style={{ position: 'absolute', left: 80 * c.u, top: listTop + i * (rowH + 10 * c.u), width: barW, height: rowH, display: 'flex', alignItems: 'center', gap: 20 * c.u, color: 'white', fontWeight: 700, fontSize: fontFor(c, 0.8), opacity: hit ? 1 : 0.4 }}>
            <span style={{ width: 38 * c.u, height: 38 * c.u, borderRadius: '50%', background: hit ? c.accent : 'transparent', border: `${3 * c.u}px solid ${hit ? c.accent : 'rgba(255,255,255,0.4)'}`, display: 'grid', placeItems: 'center', color: '#111', fontSize: 26 * c.u }}>{hit ? '✓' : ''}</span>
            {it}
          </div>
        );
      })}
    </>
  );
}

export const UI_LOOKS: Record<UiLookId, (c: UiCtx) => ReactNode> = {
  'cards-fly': cardsFly,
  'rows-cascade': rowsCascade,
  'stack-fan': stackFan,
  'click-select': clickSelect,
  'chip-filter': chipFilter,
  'toggle-switch': toggleSwitch,
  'type-search': typeSearch,
  'notify-stack': notifyStack,
  'tab-switch': tabSwitch,
  'progress-done': progressDone,
};
