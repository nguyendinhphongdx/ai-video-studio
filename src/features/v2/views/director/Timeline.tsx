'use client';

import { useRef, useState } from 'react';

import { FPS } from '@/core/domain/catalog';
import { ARRIVE_EFFECTS, MAX_EXTRAS, MAX_HOLD_SEC, MAX_VOICE_DELAY_SEC, newExtra, tuneOf, type Extra, type TimedKey } from '@/core/domain/tune';
import { estimateSpeechSec, NARRATION_DELAY_SEC } from '@/core/timeline';
import type { BlockInfo } from '@/features/episode/services/episode.api';

import { retype } from './SceneList';
import type { Draft } from './useDraft';

export type TabId = 'scene' | 'picture' | 'cast' | 'camera' | 'text' | 'audio';

/** One layer of a scene; added people and things are `x:<index>`. */
export type LayerId = 'picture' | 'hero' | 'companion' | 'item' | 'camera' | 'effect' | 'transition' | 'caption' | 'voice' | 'sfx' | 'hold' | `x:${number}`;

export const EFFECT_LAYER = { sparkle: 'Lấp lánh', flash: 'Loé sáng', impact: 'Va đập' } as const;

export const PUPPET = 'remotion/puppet';
const PICTURE = 'remotion/picture';

interface Track {
  id: LayerId;
  name: string;
  tab: TabId;
  tone: 'act' | 'cam' | 'dlg' | 'sfx' | 'fx';
  from?: number;
  to?: number;
  /** The clip's text when the layer is in the scene; null when it is not. */
  text: string | null;
  /** Puts the layer in; absent when this kind of scene cannot have it. */
  add?: () => void;
  remove?: () => void;
  /** Said in an empty lane that has nothing to add. */
  why?: string;
  /** How the bar can be dragged; without it the layer lasts the whole scene. */
  time?: { edges: ('from' | 'to')[]; move: boolean; set: (from: number, to: number) => void };
}

interface Choice {
  id: LayerId;
  label: string;
  add?: () => void;
  why?: string;
}

export interface TimelineProps {
  draft: Draft;
  block: BlockInfo;
  /** Scene types this part of the format allows. */
  types: BlockInfo[];
  people: string[];
  things: string[];
  seconds: number;
  voiceSeconds: number | null;
  frame: number;
  layer: LayerId | null;
  readOnly: boolean;
  onLayer: (id: LayerId) => void;
  onSeek: (frame: number) => void;
}

/** Every layer this scene could have, in a fixed order, and the extra people and things it could still take. */
function layersOf({ draft, block, types, people, things, seconds, voiceSeconds }: TimelineProps): { tracks: Track[]; more: { title: string; choices: Choice[] }[] } {
  const s = draft.value!;
  const p = s.props;
  const tune = tuneOf(p);
  const field = (key: string) => block.fields.find((f) => f.key === key);
  const label = (key: string) => field(key)?.options?.find((o) => o.value === p[key])?.label ?? '';
  const set = (key: string, value: unknown) => () => draft.setProp(key, value);
  const puppetType = types.find((t) => t.ref === PUPPET);
  const pictureType = types.find((t) => t.ref === PICTURE);
  const isPuppet = s.block === PUPPET;
  /** A layer with a chosen start and end. The end stays open while it touches the end of the scene. */
  const timed = (key: TimedKey, usual = 0) => {
    const at = tune[key];
    return {
      from: at?.from ?? usual,
      to: at?.to ?? seconds,
      time: { edges: ['from', 'to'] as ('from' | 'to')[], move: true, set: (from: number, to: number) => draft.setTune({ [key]: { from, ...(to < seconds - 0.05 ? { to } : {}) } }, `time:${key}`) },
    };
  };
  /** Turns this into a drawn-figure scene (with extra settings) when the format allows it. */
  const stage = (extra: Record<string, unknown>) => () => draft.change((x) => ({ ...(x.block === PUPPET ? x : retype(x, puppetType!)), props: { ...(x.block === PUPPET ? x : retype(x, puppetType!)).props, ...extra } }));
  const canStage = isPuppet || Boolean(puppetType);

  const person = people.find((id) => id !== p.lead);
  const hero: Track = {
    id: 'hero', name: 'Vai chính', tab: 'cast', tone: 'act', ...timed('heroTime'),
    text: isPuppet ? [String(p.lead || 'Nhân vật chính'), label('action'), label('emotion')].filter(Boolean).join(' · ') : null,
    add: !isPuppet && puppetType ? stage({}) : undefined,
    remove: isPuppet && pictureType ? () => draft.change((x) => retype(x, pictureType)) : undefined,
    why: 'Phần này của video không dùng nhân vật diễn',
  };
  const companion: Track = {
    id: 'companion', name: 'Nhân vật phụ', tab: 'cast', tone: 'act', ...timed('companionTime'),
    text: isPuppet && p.companion ? [String(p.companion), label('companionAction')].filter(Boolean).join(' · ') : null,
    add: canStage && person ? stage({ companion: person }) : undefined,
    remove: set('companion', ''),
    why: person ? 'Phần này của video không dùng nhân vật diễn' : 'Series chưa có ảnh nhân vật phụ',
  };
  const item: Track = {
    id: 'item', name: 'Vật phẩm', tab: 'cast', tone: 'act', ...timed('itemTime'),
    text: isPuppet && p.item ? String(p.item) : null,
    add: canStage && things[0] ? stage({ item: things[0] }) : undefined,
    remove: set('item', ''),
    why: things[0] ? 'Phần này của video không dùng nhân vật diễn' : 'Series chưa có ảnh vật phẩm',
  };

  // Every added person or thing gets its own lane, then one lane to add the next.
  const extras = tune.extras ?? [];
  const room = extras.length < MAX_EXTRAS;
  const added: Track[] = extras.map((x, i) => ({
    id: `x:${i}`, name: x.kind === 'fx' ? EFFECT_LAYER[x.id as keyof typeof EFFECT_LAYER] : x.id, tab: 'cast', tone: 'act', text: x.id, from: x.time?.from ?? 0, to: x.time?.to ?? seconds,
    time: { edges: ['from', 'to'], move: true, set: (from, to) => draft.setExtras((list) => list.map((e, k) => (k === i ? { ...e, time: { from, ...(to < seconds - 0.05 ? { to } : {}) } } : e)), `time:extra:${i}`) },
    remove: () => draft.setExtras((list) => list.filter((_, k) => k !== i), ''),
  }));
  const canLayer = canStage || s.block === PICTURE;
  const more = (kind: Extra['kind'], id: string): Choice => ({
    id: `x:${extras.length}`,
    label: id,
    why: !canLayer ? 'Phần này của video không dùng nhân vật diễn' : !room ? `Tối đa ${MAX_EXTRAS}` : undefined,
    add: canLayer && room ? () => draft.change((x) => {
      // A painted picture takes layers as it is; other scene types turn into a drawn-figure scene first.
      const base = x.block === PUPPET || x.block === PICTURE ? x : retype(x, puppetType!);
      const { _tune: _old, ...props } = base.props;
      const old = tuneOf(base.props);
      return { ...base, props: { ...props, _tune: { ...old, extras: [...(old.extras ?? []), newExtra(id, kind, old.extras ?? [])] } } };
    }) : undefined,
  });

  // Light effects on a painted picture; weather and light of the set on a drawn-figure scene.
  const effectKey = field('fx') ? 'fx' : field('mood') ? 'mood' : null;
  const none = effectKey === 'fx' ? 'none' : 'calm';
  const effect: Track = {
    id: 'effect', name: 'Hiệu ứng hình', tab: 'camera', tone: 'fx', ...timed('effectTime'),
    text: effectKey && p[effectKey] !== none ? label(effectKey) : null,
    add: effectKey ? set(effectKey, effectKey === 'fx' ? 'sheen' : 'magic') : undefined,
    remove: effectKey ? set(effectKey, none) : undefined,
    why: 'Loại cảnh này không có hiệu ứng hình',
  };
  const delay = tune.voiceDelay ?? 0;
  const speech = Math.min(seconds - NARRATION_DELAY_SEC, voiceSeconds ?? estimateSpeechSec(s.narration));
  const caption = Boolean(field('caption'));

  const tracks: Track[] = [
    { id: 'picture', name: 'Hình', tab: 'picture', tone: 'fx', text: field('imagePrompt') ? String(p.imagePrompt || 'Chưa có mô tả') : null, why: 'Loại cảnh này không dùng ảnh' },
    hero,
    companion,
    item,
    ...added,
    { id: 'camera', name: 'Máy quay', tab: 'camera', tone: 'cam', text: field('motion') ? [label('motion'), label('rhythm')].filter(Boolean).join(' · ') : null, why: isPuppet ? 'Cảnh nhân vật diễn tự đẩy máy chậm' : 'Loại cảnh này tự chuyển động' },
    effect,
    {
      id: 'transition', name: 'Chuyển cảnh', tab: 'camera', tone: 'cam', from: 0, to: 1,
      text: field('transition') && p.transition !== 'cut' ? label('transition') : null,
      add: field('transition') ? set('transition', 'fade') : undefined,
      remove: set('transition', 'cut'),
      why: 'Loại cảnh này không đổi được cách mở',
    },
    {
      id: 'caption', name: 'Chữ', tab: 'text', tone: 'sfx', ...timed('captionTime', 0.4),
      text: caption && p.caption && tune.captionPlace !== 'off' ? String(p.caption) : null,
      // Hidden words come back as they were; a scene with none gets a box to type in.
      add: caption ? () => draft.change((x) => {
        const { _tune: _old, ...props } = x.props;
        const { captionPlace: _place, ...rest } = tune;
        return { ...x, props: { ...props, caption: x.props.caption || 'Chữ mới', ...(Object.keys(rest).length ? { _tune: rest } : {}) } };
      }) : undefined,
      remove: () => draft.setTune({ captionPlace: 'off' }),
      why: 'Loại cảnh này không có chú thích',
    },
    {
      id: 'voice', name: 'Giọng đọc', tab: 'audio', tone: 'dlg', from: NARRATION_DELAY_SEC + delay, to: NARRATION_DELAY_SEC + delay + speech,
      // The voice has its own length: only its start moves.
      time: { edges: [], move: true, set: (from) => draft.setTune({ voiceDelay: Math.max(0, Math.min(MAX_VOICE_DELAY_SEC, from - NARRATION_DELAY_SEC)) }, 'time:voice') },
      text: s.narration.trim() ? s.narration : null,
      // Words cannot be invented here: adding opens the box to write them.
      add: () => {},
      remove: () => draft.setNarration(''),
    },
    {
      id: 'sfx', name: 'Tiếng động', tab: 'audio', tone: 'sfx', from: 0, to: 0.8,
      text: tune.sfxVolume === 0 ? null : tune.sfxVolume ? `♪ ${Math.round(tune.sfxVolume * 100)}%` : '♪ Tự động',
      add: () => draft.setTune({ sfxVolume: undefined }),
      remove: () => draft.setTune({ sfxVolume: 0 }),
    },
    {
      id: 'hold', name: 'Nghỉ cuối', tab: 'scene', tone: 'fx', from: seconds - (tune.holdSec ?? 0), to: seconds,
      // Dragging its left edge makes the pause longer or shorter.
      time: { edges: ['from'], move: false, set: (from) => draft.setTune({ holdSec: Math.max(0, Math.min(MAX_HOLD_SEC, Math.round((seconds - from) * 10) / 10)) }, 'time:hold') },
      text: tune.holdSec ? `${tune.holdSec}s` : null,
      add: () => draft.setTune({ holdSec: 1 }),
      remove: () => draft.setTune({ holdSec: 0 }),
    },
  ];
  return {
    tracks,
    more: [
      { title: 'Thêm người vào khung', choices: people.map((id) => more('person', id)) },
      { title: 'Thêm vật phẩm vào khung', choices: things.map((id) => more('item', id)) },
      { title: 'Thêm hiệu ứng tại một điểm', choices: ARRIVE_EFFECTS.map((id) => ({ ...more('fx', id), label: EFFECT_LAYER[id] })) },
    ],
  };
}

/** The button under the lanes: opens the kinds of layer that can still be added to this scene. */
function AddLayer({ tracks, more, onAdd }: { tracks: Track[]; more: { title: string; choices: Choice[] }[]; onAdd: (add: () => void, id: LayerId) => void }) {
  const [open, setOpen] = useState(false);
  const missing = tracks.filter((t) => t.text === null && (t.add || t.why));
  const groups = [
    { title: 'Lớp', choices: missing.map((t) => ({ id: t.id, label: t.name, add: t.add, why: t.add ? undefined : t.why })) },
    ...more,
  ].filter((g) => g.choices.length > 0);
  return (
    <div className="layermenu" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" className="btn sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        + Thêm lớp
      </button>
      {open &&
        groups.map((g) => (
          <div key={g.title} className="group" role="group" aria-label={g.title}>
            <span className="cap">{g.title}</span>
            {g.choices.map((c) => (
              <button
                key={c.label}
                type="button"
                className="choice"
                disabled={!c.add}
                title={c.why}
                onClick={() => {
                  setOpen(false);
                  onAdd(c.add!, c.id);
                }}
              >
                {c.label}
                {c.why && <small>{c.why}</small>}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

const snap = (s: number) => Math.round(s * 10) / 10;
/** Shortest time a layer may be on screen. */
const MIN_SEC = 0.3;

/** One bar: click to open its settings; drag the middle to move it, an end to start or stop it elsewhere. */
function Clip({ track: t, seconds, selected, readOnly, onOpen }: { track: Track; seconds: number; selected: boolean; readOnly: boolean; onOpen: () => void }) {
  const from = t.from ?? 0;
  const to = Math.min(seconds, t.to ?? seconds);
  const drag = useRef<{ part: 'from' | 'to' | 'move'; x: number; from: number; to: number; lane: number; seconds: number; moved: boolean } | null>(null);
  const time = readOnly ? undefined : t.time;
  const pct = (s: number) => `${Math.max(0, Math.min(100, (s / seconds) * 100))}%`;

  const start = (e: React.PointerEvent, part: 'from' | 'to' | 'move') => {
    e.stopPropagation();
    if (!time || (part === 'move' && !time.move)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const lane = (e.currentTarget.closest('.lanebox') as HTMLElement).getBoundingClientRect().width;
    // The scene may grow while dragging (voice, pause): keep the scale of the moment the drag began.
    drag.current = { part, x: e.clientX, from, to, lane, seconds, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !time) return;
    if (Math.abs(e.clientX - d.x) < 3 && !d.moved) return;
    d.moved = true;
    const by = ((e.clientX - d.x) / d.lane) * d.seconds;
    const length = d.to - d.from;
    if (d.part === 'from') time.set(snap(Math.max(0, Math.min(d.to - (t.time!.move ? MIN_SEC : 0), d.from + by))), d.to);
    else if (d.part === 'to') time.set(d.from, snap(Math.max(d.from + MIN_SEC, Math.min(d.seconds, d.to + by))));
    else {
      const next = snap(Math.max(0, Math.min(d.seconds - MIN_SEC, d.from + by)));
      time.set(next, snap(Math.min(d.seconds, next + length)));
    }
  };
  const handlers = (part: 'from' | 'to' | 'move') => ({ onPointerDown: (e: React.PointerEvent) => start(e, part), onPointerMove: move, onPointerUp: () => setTimeout(() => (drag.current = null)) });
  return (
    <button
      type="button"
      className={`clip ${t.tone}${selected ? ' sel' : ''}${time?.move ? ' movable' : ''}`}
      style={{ left: pct(from), width: pct(to - from) }}
      title={t.time ? `${from.toFixed(1)}s đến ${to.toFixed(1)}s · kéo để đổi giờ` : 'Có suốt cảnh'}
      onClick={(e) => {
        e.stopPropagation();
        if (!drag.current?.moved) onOpen();
      }}
      {...handlers('move')}
    >
      {time?.edges.includes('from') && <span className="edge l" {...handlers('from')} />}
      {t.text}
      {time?.edges.includes('to') && <span className="edge r" {...handlers('to')} />}
    </button>
  );
}

/** A lane opens that layer's settings, the ruler moves the playhead. */
export function Timeline(props: TimelineProps) {
  const { seconds, frame, layer, readOnly, onLayer, onSeek } = props;
  const pct = (s: number) => `${Math.max(0, Math.min(100, (s / seconds) * 100))}%`;
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(((e.clientX - r.left) / r.width) * seconds * FPS));
  };
  const { tracks, more } = layersOf(props);
  return (
    <div className="dtl">
      <div className="trk">
        <b />
        <div className="ruler" onClick={seek} role="slider" aria-label="Vị trí phát" aria-valuenow={frame} tabIndex={-1}>
          {Array.from({ length: Math.floor(seconds) + 1 }, (_, s) => (
            <span key={s} style={{ left: pct(s) }}>
              {s}s
            </span>
          ))}
          <i className="head" style={{ left: pct(frame / FPS) }} />
        </div>
        <span />
      </div>
      {tracks
        .filter((t) => t.text !== null)
        .map((t) => (
          <div className="trk" key={t.id}>
            <button type="button" className={`lname${layer === t.id ? ' sel' : ''}`} onClick={() => onLayer(t.id)}>
              {t.name}
            </button>
            <div className="lanebox" onClick={seek}>
              <Clip track={t} seconds={seconds} selected={layer === t.id} readOnly={readOnly} onOpen={() => onLayer(t.id)} />
              <i className="head" style={{ left: pct(frame / FPS) }} />
            </div>
            {t.remove && !readOnly ? (
              <button type="button" className="drop" onClick={t.remove} aria-label={`Bỏ ${t.name.toLowerCase()}`} title={`Bỏ ${t.name.toLowerCase()} (hoàn tác được)`}>
                ×
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      {!readOnly && <AddLayer tracks={tracks} more={more} onAdd={(add, id) => (add(), onLayer(id))} />}
    </div>
  );
}
