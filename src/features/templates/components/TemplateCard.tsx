'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { SceneBrand } from '@video/primitives';

import { GROUPS, type TemplateEntry } from '../lib/catalog';
import { LazyScenePlayer } from './LazyScenePlayer';

export function TemplateCard({ entry, brand }: { entry: TemplateEntry; brand: SceneBrand }) {
  const [copied, setCopied] = useState(false);
  const group = GROUPS.find((g) => g.id === entry.group)?.label;
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
      <LazyScenePlayer block={entry.preview.block} props={entry.preview.props} brand={brand} needsImage={entry.needsImage} />
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
