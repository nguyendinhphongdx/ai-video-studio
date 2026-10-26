'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PublishKit, Scene } from '@/core/domain/episode';

import type { EpisodeView, SaveScriptInput } from '../../services/episode.api';

export interface ScriptDraftState {
  title: string;
  scenes: Scene[];
  publish: PublishKit | null;
}

const fromView = (v: EpisodeView): ScriptDraftState => ({ title: v.episode.title, scenes: v.episode.scenes, publish: v.episode.publish });
const sig = (d: ScriptDraftState) => JSON.stringify(d);

/** Local, editable copy of the script. Server updates replace it only while there are no unsaved edits. */
export function useScriptDraft(view: EpisodeView) {
  const server = useMemo(() => fromView(view), [view]);
  const [draft, setDraft] = useState(server);
  const dirty = sig(draft) !== sig(server);
  const [base, setBase] = useState(sig(server));

  useEffect(() => {
    const s = sig(server);
    if (s !== base) {
      // Take the server version unless the person has edits of their own.
      if (sig(draft) === base) setDraft(server);
      setBase(s);
    }
  }, [server, base, draft]);

  const updateScene = (id: string, patch: Partial<Scene>) => setDraft((d) => ({ ...d, scenes: d.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const removeScene = (id: string) => setDraft((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== id) }));
  const insertScene = (scene: Scene, afterSlot: string) =>
    setDraft((d) => {
      const lastInSlot = d.scenes.map((s) => s.slotId).lastIndexOf(afterSlot);
      const scenes = [...d.scenes];
      scenes.splice(lastInSlot >= 0 ? lastInSlot + 1 : scenes.length, 0, scene);
      return { ...d, scenes };
    });
  /** Swap with the neighbour in the same slot. */
  const moveScene = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      const slot = d.scenes[i]?.slotId;
      let j = i + dir;
      while (j >= 0 && j < d.scenes.length && d.scenes[j]!.slotId !== slot) j += dir;
      if (i < 0 || j < 0 || j >= d.scenes.length) return d;
      const scenes = [...d.scenes];
      [scenes[i], scenes[j]] = [scenes[j]!, scenes[i]!];
      return { ...d, scenes };
    });

  const toInput = (): SaveScriptInput => ({
    title: draft.title,
    scenes: draft.scenes.map(({ id, slotId, block, locked, narration, props }) => ({ id, slotId, block, locked, narration, props })),
    publish: draft.publish,
  });

  return { draft, setDraft, dirty, reset: () => setDraft(server), updateScene, removeScene, insertScene, moveScene, toInput };
}
