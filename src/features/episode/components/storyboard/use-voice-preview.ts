'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Scene } from '@/core/domain/episode';
import { errorMessage } from '@/lib/api/client';

import type { VoiceLine } from '../../lib/preview';
import { episodeApi } from '../../services/episode.api';

const durationOf = (url: string) =>
  new Promise<number>((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(a.duration || 0);
    a.onerror = () => resolve(0);
    a.src = url;
  });

/**
 * Real Edge TTS lines for the storyboard, cached by (voice, text) so edits only re-fetch what changed.
 * Feeds both the per-scene ▶ buttons and the player (real timings instead of estimates).
 */
export function useVoicePreview(voice: string) {
  const cache = useRef(new Map<string, VoiceLine>());
  const [, bump] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const key = (text: string) => `${voice}|${text}`;

  useEffect(() => () => audio.current?.pause(), []);

  const ensure = useCallback(
    async (text: string): Promise<VoiceLine> => {
      const hit = cache.current.get(key(text));
      if (hit) return hit;
      const { url } = await episodeApi.previewVoice(text, voice);
      const line = { url, seconds: await durationOf(url) };
      cache.current.set(key(text), line);
      bump((n) => n + 1);
      return line;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voice],
  );

  const play = async (scene: Scene) => {
    if (playing === scene.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    if (!scene.narration.trim()) return;
    setLoading(scene.id);
    try {
      const line = await ensure(scene.narration);
      audio.current?.pause();
      audio.current = new Audio(line.url);
      audio.current.onended = () => setPlaying(null);
      setPlaying(scene.id);
      await audio.current.play();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  /** Fetch every line (sequentially: the free service throttles bursts). */
  const loadAll = async (scenes: Scene[]) => {
    for (const s of scenes) {
      if (!s.narration.trim() || cache.current.has(key(s.narration))) continue;
      setLoading(s.id);
      try {
        await ensure(s.narration);
      } catch (e) {
        toast.error(errorMessage(e));
        break;
      }
    }
    setLoading(null);
  };

  /** Lines already fetched for these scenes (by scene id). */
  const linesFor = (scenes: Scene[]) => {
    const map = new Map<string, VoiceLine>();
    for (const s of scenes) {
      const line = cache.current.get(key(s.narration));
      if (line) map.set(s.id, line);
    }
    return map;
  };

  return { play, loadAll, linesFor, loading, playing };
}
