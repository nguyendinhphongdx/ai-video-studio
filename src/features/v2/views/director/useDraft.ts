'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Scene } from '@/core/domain/episode';
import { parseTune, TUNE_KEY, tuneOf, type Extra, type SceneTune } from '@/core/domain/tune';

const content = (s: Scene) => JSON.stringify([s.block, s.narration, s.props]);
/** Changes closer together than this (typing, dragging) are one undo step. */
const COALESCE_MS = 700;

export type Draft = ReturnType<typeof useDraft>;

/** The scene being edited, with undo and redo. It follows the saved scene only when the saved content changes. */
export function useDraft(saved: Scene | null) {
  const key = saved ? `${saved.id}:${content(saved)}` : '';
  const [state, setState] = useState<{ key: string; value: Scene | null; past: Scene[]; future: Scene[] }>({ key: '', value: null, past: [], future: [] });
  const last = useRef({ at: 0, tag: '' });

  useEffect(() => {
    // A new scene, or new saved content: start over. Undo survives a save of the same scene.
    setState((s) => {
      const same = s.value && saved && s.value.id === saved.id;
      return { key, value: saved ? structuredClone(saved) : null, past: same ? s.past : [], future: [] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the saved content
  }, [key]);

  // Approval and assets always come from the server; only the editable content is a draft.
  const value = state.value && saved && state.value.id === saved.id ? { ...state.value, approved: saved.approved, assets: saved.assets } : null;
  const dirty = Boolean(value && saved && content(value) !== content(saved));

  /** `tag` names what is being changed, so a run of keystrokes in one box undoes at once. */
  const change = useCallback((next: (s: Scene) => Scene, tag = '') => {
    const now = Date.now();
    const merge = tag !== '' && tag === last.current.tag && now - last.current.at < COALESCE_MS;
    last.current = { at: now, tag };
    setState((s) => (s.value ? { ...s, value: next(s.value), past: merge ? s.past : [...s.past.slice(-49), s.value], future: [] } : s));
  }, []);

  const setProp = useCallback((name: string, v: unknown) => change((s) => ({ ...s, props: { ...s.props, [name]: v } }), name), [change]);
  const setNarration = useCallback((narration: string) => change((s) => ({ ...s, narration }), 'narration'), [change]);
  const setTune = useCallback(
    (patch: Partial<SceneTune>, tag = Object.keys(patch).join()) =>
      change((s) => {
        const { [TUNE_KEY]: _old, ...props } = s.props;
        const tune = parseTune({ ...tuneOf(s.props), ...patch });
        return { ...s, props: tune ? { ...props, [TUNE_KEY]: tune } : props };
      }, `tune:${tag}`),
    [change],
  );

  const setExtras = useCallback((next: (list: Extra[]) => Extra[], tag = 'extras') => change((s) => {
    const { [TUNE_KEY]: _old, ...props } = s.props;
    const old = tuneOf(s.props);
    const tune = parseTune({ ...old, extras: next(old.extras ?? []) });
    return { ...s, props: tune ? { ...props, [TUNE_KEY]: tune } : props };
  }, tag), [change]);

  const undo = useCallback(() => {
    last.current = { at: 0, tag: '' };
    setState((s) => (s.value && s.past.length ? { ...s, value: s.past.at(-1)!, past: s.past.slice(0, -1), future: [s.value, ...s.future] } : s));
  }, []);
  const redo = useCallback(() => {
    last.current = { at: 0, tag: '' };
    setState((s) => (s.value && s.future.length ? { ...s, value: s.future[0]!, past: [...s.past, s.value], future: s.future.slice(1) } : s));
  }, []);
  const reset = useCallback(() => change(() => structuredClone(saved!)), [change, saved]);

  return { value, dirty, change, setProp, setNarration, setTune, setExtras, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
