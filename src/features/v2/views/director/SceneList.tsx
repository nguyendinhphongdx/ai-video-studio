'use client';

import type { Scene } from '@/core/domain/episode';
import { newId } from '@/core/domain/ids';
import type { BlockInfo, EpisodeView, SaveScriptInput } from '@/features/episode/services/episode.api';

import { toSaveInput } from '../episode/save';

type Row = SaveScriptInput['scenes'][number] & { id: string };

/** Whole-scene operations. Each returns the script to save and the scene to show afterwards. */
export function sceneOps(v: EpisodeView, blocks: Map<string, BlockInfo>, sceneId: string) {
  const base = toSaveInput(v, {});
  const rows: Row[] = base.scenes.map((s) => ({ ...s, id: s.id ?? '' }));
  const at = rows.findIndex((s) => s.id === sceneId);
  const current = rows[at];
  const slotOf = (id: string) => v.slots.find((s) => s.id === id);
  const aiSlot = current && slotOf(current.slotId)?.fill === 'ai' ? slotOf(current.slotId) : v.slots.find((s) => s.fill === 'ai');
  const withRows = (scenes: Row[]) => ({ ...base, scenes });
  const insert = (row: Row) => {
    const scenes = [...rows];
    // After the current scene when they share a part of the format, else at the end of the part it belongs to.
    const where = current?.slotId === row.slotId ? at + 1 : scenes.map((s) => s.slotId).lastIndexOf(row.slotId) + 1 || scenes.length;
    scenes.splice(where, 0, row);
    return { input: withRows(scenes), show: row.id };
  };
  const editableRow = Boolean(current && !current.locked);
  const neighbour = (d: -1 | 1) => editableRow && rows[at + d] && !rows[at + d]!.locked && rows[at + d]!.slotId === current!.slotId;
  return {
    canAdd: Boolean(aiSlot),
    canEdit: editableRow,
    canMove: (d: -1 | 1) => Boolean(neighbour(d)),
    add: () => {
      const ref = aiSlot!.blocks.includes(current?.block ?? '') ? current!.block : aiSlot!.blocks[0]!;
      return insert({ id: newId(), slotId: aiSlot!.id, block: ref, locked: false, narration: '', props: { ...(blocks.get(ref)?.defaults ?? {}), caption: '' } });
    },
    duplicate: () => insert({ ...current!, id: newId() }),
    remove: () => ({ input: withRows(rows.filter((s) => s.id !== sceneId)), show: (rows[at + 1] ?? rows[at - 1])?.id ?? '' }),
    move: (d: -1 | 1) => {
      const scenes = [...rows];
      [scenes[at], scenes[at + d]] = [scenes[at + d]!, scenes[at]!];
      return { input: withRows(scenes), show: sceneId };
    },
    types: (slotOf(current?.slotId ?? '')?.blocks ?? []).flatMap((ref) => (blocks.get(ref) ? [blocks.get(ref)!] : [])),
  };
}

/** Another type of scene starts from its own settings, keeping what both types understand. */
export function retype(scene: Scene, to: BlockInfo): Scene {
  const keep = Object.fromEntries(Object.entries(scene.props).filter(([k]) => ['caption', 'imagePrompt', 'transition', '_tune'].includes(k)));
  return { ...scene, block: to.ref as Scene['block'], props: { ...to.defaults, ...keep } };
}

export function SceneList({ view, sceneId, blocks, canAdd, disabled, onOpen, onAdd }: { view: EpisodeView; sceneId: string; blocks: Map<string, BlockInfo>; canAdd: boolean; disabled: boolean; onOpen: (id: string) => void; onAdd: () => void }) {
  return (
    <aside className="edleft dlist" aria-label="Các cảnh">
      <div className="dlist-scroll">
        {view.episode.scenes.map((s, i) => {
          const a = view.assets[s.id];
          const state = s.approved ? { cls: 'ok', mark: '✓', text: 'Đã duyệt' } : a?.ready ? { cls: 'info', mark: '•', text: 'Chờ duyệt' } : { cls: 'warn', mark: '!', text: a?.imageStale || a?.voiceStale ? 'Cần làm lại' : 'Còn thiếu' };
          return (
            <button key={s.id} className={`drow${s.id === sceneId ? ' on' : ''}`} onClick={() => onOpen(s.id)} aria-current={s.id === sceneId}>
              <div className={a?.imageUrl ? 'thumb' : 'thumb empty'} style={a?.imageUrl ? { background: `center / cover url(${a.imageUrl})` } : undefined}>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <span className="txt">{s.narration || String(s.props.caption ?? '') || blocks.get(s.block)?.name || s.block}</span>
              <span className={`chip ${state.cls}`} title={state.text}>
                {state.mark}
              </span>
            </button>
          );
        })}
      </div>
      <button className="btn sm" disabled={disabled || !canAdd} onClick={onAdd}>
        + Thêm cảnh
      </button>
    </aside>
  );
}
