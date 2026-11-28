'use client';

import { useRef, useState } from 'react';

import type { Scene } from '@/core/domain/episode';
import { tuneOf, type Extra, type Placement, type TuneLayer } from '@/core/domain/tune';
import { ANCHOR_X, type Side } from '@video/puppet/rig';

import type { Draft } from './useDraft';

const LABEL: Record<TuneLayer, string> = { hero: 'Vai chính', companion: 'Nhân vật phụ', item: 'Vật phẩm' };

/** Where each figure stands before any adjustment, as fractions of the frame (mirrors remotion/blocks/puppet.tsx). */
function restingBoxes(scene: Scene): { layer: TuneLayer; x: number; bottom: number; w: number; h: number }[] {
  const side = (String(scene.props.side ?? 'center') || 'center') as Side;
  const stage = 0.66;
  const ground = 0.17;
  const heroX = ANCHOR_X[side] ?? 0.5;
  const mainH = scene.props.lead ? stage * 0.86 : stage;
  const boxes: { layer: TuneLayer; x: number; bottom: number; w: number; h: number }[] = [{ layer: 'hero', x: heroX, bottom: ground, h: mainH, w: mainH * 0.34 }];
  if (scene.props.companion) boxes.push({ layer: 'companion', x: ANCHOR_X[side === 'right' ? 'left' : 'right'], bottom: ground, h: stage * 0.86, w: stage * 0.3 });
  if (scene.props.item) boxes.push({ layer: 'item', x: heroX + (heroX > 0.5 ? -0.17 : 0.17), bottom: ground + stage * 0.42, h: stage * 0.5, w: stage * 0.28 });
  return boxes;
}

/** An added figure's box, as fractions of the frame. */
const extraBox = (e: Extra) => (e.kind === 'item' ? { x: e.x, bottom: 0.17 + e.y, h: 0.33 * e.scale, w: 0.18 * e.scale } : { x: e.x, bottom: 0.17 + e.y, h: 0.57 * e.scale, w: 0.2 * e.scale });

/** Handles over the preview: drag a figure to move it; the corner changes its size. */
export function DragLayer({ draft, onGrab }: { draft: Draft; onGrab: () => void }) {
  const scene = draft.value!;
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ layer: TuneLayer; mode: 'move' | 'size'; x: number; y: number; from: Placement; h: number } | null>(null);
  const [active, setActive] = useState<TuneLayer | null>(null);
  const tune = tuneOf(scene.props);
  const held = useRef<{ index: number; mode: 'move' | 'size'; x: number; y: number; from: Extra } | null>(null);
  const grabExtra = (e: React.PointerEvent, index: number, mode: 'move' | 'size', from: Extra) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = { index, mode, x: e.clientX, y: e.clientY, from };
    onGrab();
  };
  const dragExtra = (e: React.PointerEvent) => {
    const d = held.current;
    const rect = box.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.x) / rect.width;
    const dy = (e.clientY - d.y) / rect.height;
    const next = d.mode === 'move' ? { ...d.from, x: d.from.x + dx, y: d.from.y - dy } : { ...d.from, scale: d.from.scale - dy / 0.5 };
    draft.setExtras((list) => list.map((x, i) => (i === d.index ? next : x)), `drag:extra:${d.index}:${d.mode}`);
  };
  const drop = () => {
    held.current = null;
  };
  const handles = (index: number, mode: 'move' | 'size', from: Extra) => ({ onPointerDown: (e: React.PointerEvent) => grabExtra(e, index, mode, from), onPointerMove: dragExtra, onPointerUp: drop });

  const start = (e: React.PointerEvent, layer: TuneLayer, mode: 'move' | 'size', h: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { layer, mode, x: e.clientX, y: e.clientY, h, from: tune[layer] ?? { dx: 0, dy: 0, scale: 1 } };
    setActive(layer);
    onGrab();
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const rect = box.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.x) / rect.width;
    const dy = (e.clientY - d.y) / rect.height;
    const next = d.mode === 'move' ? { ...d.from, dx: d.from.dx + dx, dy: d.from.dy + dy } : { ...d.from, scale: d.from.scale - dy / d.h };
    draft.setTune({ [d.layer]: next }, `drag:${d.layer}:${d.mode}`);
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div className="draglayer" ref={box}>
      {(tune.extras ?? []).map((x, i) => {
        const b = extraBox(x);
        const w = b.w * (9 / 16) * 1.6;
        return (
          <div key={`x${i}`} className="handle" style={{ left: `${(b.x - w / 2) * 100}%`, bottom: `${b.bottom * 100}%`, width: `${w * 100}%`, height: `${b.h * 100}%` }} aria-label={`Kéo để dời ${x.id}`} {...handles(i, 'move', x)}>
            <span className="name">{x.id}</span>
            <span className="grip" title="Kéo lên xuống để đổi cỡ" {...handles(i, 'size', x)} />
          </div>
        );
      })}
      {restingBoxes(scene).map((b) => {
        const p = tune[b.layer] ?? { dx: 0, dy: 0, scale: 1 };
        // The box width is a share of the frame height; on a 16:9 frame that is 9/16 of it in width terms.
        const w = b.w * p.scale * (9 / 16);
        const h = b.h * p.scale;
        return (
          <div
            key={b.layer}
            className={`handle${active === b.layer ? ' on' : ''}`}
            style={{ left: `${(b.x + p.dx - w / 2) * 100}%`, bottom: `${(b.bottom - p.dy) * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
            onPointerDown={(e) => start(e, b.layer, 'move', b.h)}
            onPointerMove={move}
            onPointerUp={end}
            aria-label={`Kéo để dời ${LABEL[b.layer]}`}
          >
            <span className="name">{LABEL[b.layer]}</span>
            <span className="grip" title="Kéo lên xuống để đổi cỡ" onPointerDown={(e) => start(e, b.layer, 'size', b.h)} onPointerMove={move} onPointerUp={end} />
          </div>
        );
      })}
    </div>
  );
}
