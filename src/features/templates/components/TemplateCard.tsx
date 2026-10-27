'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ScenePlayer } from '@/features/episode/components/preview';
import type { SceneBrand } from '@video/primitives';

import { GROUPS, SAMPLE_IMAGE, type TemplateEntry } from '../lib/catalog';

/** True while the element is on screen; the live player is only mounted then, so a long page stays light. */
function useInView<T extends Element>() {
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

export function TemplateCard({ entry, brand }: { entry: TemplateEntry; brand: SceneBrand }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [copied, setCopied] = useState(false);
  const group = GROUPS.find((g) => g.id === entry.group)?.label;
  const props = entry.needsImage ? { ...entry.preview.props, image: SAMPLE_IMAGE } : entry.preview.props;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không chép được. Bạn tự gõ: ' + entry.copy);
    }
  };
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div ref={ref} className="aspect-video overflow-hidden rounded-lg bg-muted">
        {inView ? <ScenePlayer block={entry.preview.block} props={props} ordinal={1} brand={brand} durationSec={4} startFrame={0} /> : null}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <h3 className="text-body font-bold">{entry.name}</h3>
        <p className="text-small text-slate-700">{entry.hint}</p>
        <p className="text-caption text-muted-foreground">
          {group} · <span className="font-mono">{entry.copy}</span>
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Đã chép' : 'Chép tên'}
      </Button>
    </article>
  );
}
