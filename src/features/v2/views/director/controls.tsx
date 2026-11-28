'use client';

import type { ReactNode } from 'react';

import type { ToolField } from '@/core/tools/tool';

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="col dsec">
      <span className="eyebrow">{title}</span>
      {children}
      {hint && <span className="cap">{hint}</span>}
    </section>
  );
}

/** A row of choices where one is on; the whole set is visible, unlike a drop-down. */
export function Chips({ label, options, value, disabled, onChange }: { label: string; options: readonly { value: string; label: string }[]; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`pick${value === o.value ? ' on' : ''}`} aria-pressed={value === o.value} disabled={disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, show, disabled, onChange }: { label: string; value: number; min: number; max: number; step: number; show: string; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
      <b>{show}</b>
    </label>
  );
}

/** Cast pictures as buttons, with "none" first. */
export function CastPicker({ label, ids, cast, value, noneLabel, disabled, onChange }: { label: string; ids: string[]; cast: Record<string, string>; value: string; noneLabel: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="castgrid" role="group" aria-label={label}>
      {['', ...ids].map((id) => (
        <button key={id || '-'} type="button" className={`pick${value === id ? ' on' : ''}`} aria-pressed={value === id} disabled={disabled} onClick={() => onChange(id)} title={id || noneLabel}>
          {id && cast[id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast[id]} alt="" />
          ) : (
            <span className="none">∅</span>
          )}
          <span>{id || noneLabel}</span>
        </button>
      ))}
    </div>
  );
}

/** Any block field the director has no special control for (counter values, quiz answers...). */
export function FieldEditor({ field: f, value, disabled, onChange }: { field: ToolField; value: unknown; disabled: boolean; onChange: (v: unknown) => void }) {
  const id = `sd-${f.key}`;
  return (
    <div className="field">
      <label htmlFor={id}>{f.label}</label>
      {f.kind === 'choice' ? (
        <select id={id} className="select" disabled={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(f.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.kind === 'textarea' ? (
        <textarea id={id} className="area" maxLength={f.maxLength} readOnly={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : f.kind === 'count' ? (
        <input id={id} className="input" type="number" min={f.min} max={f.max} readOnly={disabled} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} />
      ) : f.kind === 'color' ? (
        <input id={id} className="input" type="color" disabled={disabled} value={String(value ?? '#000000')} onChange={(e) => onChange(e.target.value)} style={{ padding: 2, width: 64 }} />
      ) : (
        <input id={id} className="input" maxLength={f.maxLength} readOnly={disabled} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <span className="cap">{f.hint}</span>}
    </div>
  );
}

/** Where the subject sits in each kind of shot, as [x, y, radius] on a 64 × 36 frame. */
const SHOT_ART: Record<string, [number, number, number][]> = {
  auto: [],
  wide: [[32, 26, 4]],
  'close-up': [[32, 20, 14]],
  macro: [[44, 24, 26]],
  'top-down': [[22, 14, 5], [38, 20, 6], [30, 27, 4]],
  'low-angle': [[32, 14, 11]],
  diagonal: [[16, 27, 5], [32, 18, 6], [48, 9, 7]],
  'left-third': [[16, 21, 9]],
  'right-third': [[48, 21, 9]],
  split: [[16, 20, 8], [48, 20, 8]],
  'scale-contrast': [[22, 21, 14], [52, 30, 3]],
  'frame-in-frame': [[32, 18, 7]],
  cluster: [[24, 22, 6], [36, 14, 5], [41, 24, 7], [30, 28, 4]],
};

export function ShotTiles({ options, value, disabled, onChange }: { options: { value: string; label: string }[]; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="shotgrid" role="group" aria-label="Kiểu khung hình">
      {options.map((o) => (
        <button key={o.value} type="button" className={`pick${value === o.value ? ' on' : ''}`} aria-pressed={value === o.value} disabled={disabled} onClick={() => onChange(o.value)}>
          <svg viewBox="0 0 64 36" aria-hidden>
            <rect width="64" height="36" rx="3" />
            {o.value === 'auto' && (
              <text x="32" y="23" textAnchor="middle">
                A
              </text>
            )}
            {o.value === 'split' && <line x1="32" y1="2" x2="32" y2="34" />}
            {o.value === 'frame-in-frame' && <rect className="inner" x="16" y="6" width="32" height="24" rx="2" />}
            {(SHOT_ART[o.value] ?? []).map(([x, y, r]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
            ))}
          </svg>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
