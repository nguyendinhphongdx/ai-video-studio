'use client';

import { useEffect, useRef, useState } from 'react';

import { ScenePlayer } from '@/features/episode/components/preview';
import type { SceneBrand } from '@video/primitives';

import { SAMPLE_IMAGE } from '../lib/catalog';

/** True while the element is on screen; a live player is only mounted then, so a page of previews stays light. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setInView(true);
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** A looping preview of one scene type on the channel's brand, started only when scrolled into view. */
export function LazyScenePlayer({ block, props, brand, needsImage, className }: { block: string; props: Record<string, unknown>; brand: SceneBrand; needsImage: boolean; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={className ?? 'aspect-video overflow-hidden rounded-lg bg-muted'}>
      {inView ? <ScenePlayer block={block} props={needsImage ? { ...props, image: SAMPLE_IMAGE } : props} ordinal={1} brand={brand} durationSec={4} startFrame={0} /> : null}
    </div>
  );
}
