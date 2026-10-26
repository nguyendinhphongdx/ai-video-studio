import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Highlights @tool / @tool/block mentions; known ones in brand colour, unknown ones in red. */
function inline(text: string, known: (ref: string) => boolean): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(@[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?)|(`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [tok] = m;
    if (m[1]) out.push(<b key={m.index} className="text-foreground">{inline(tok.slice(2, -2), known)}</b>);
    else if (m[2]) out.push(<span key={m.index} className={cn('rounded px-1 font-semibold', known(tok.slice(1)) ? 'bg-accent text-accent-foreground' : 'bg-danger-soft text-destructive')}>{tok}</span>);
    else out.push(<code key={m.index} className="rounded bg-muted px-1 text-foreground">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** SKILL.md as a read-only code view: front matter, headings, lists and tool mentions highlighted. */
export function SkillMarkdown({ markdown, known }: { markdown: string; known: (ref: string) => boolean }) {
  const lines = markdown.replace(/\n$/, '').split('\n');
  let fence = 0;
  return (
    <div role="region" aria-label="Nội dung SKILL.md" className="rounded-xl border bg-card px-3 py-4 font-mono text-[13px] leading-relaxed text-slate-700">
      {lines.map((line, i) => {
        let node: ReactNode;
        if (line.trim() === '---' && fence < 2) {
          fence += 1;
          node = <span className="text-muted-foreground">{line}</span>;
        } else if (fence === 1) {
          const m = /^([\w-]+):(.*)$/.exec(line);
          node = m ? (
            <>
              <span className="font-semibold text-primary">{m[1]}</span>:<span className="text-amber-800">{m[2]}</span>
            </>
          ) : (
            line
          );
        } else if (/^#{1,6}\s/.test(line)) node = <span className="font-bold text-foreground">{line}</span>;
        else node = inline(line, known);
        return (
          <div key={i} className="flex gap-4">
            <span className="w-6 shrink-0 select-none text-right text-muted-foreground/60" aria-hidden>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{node || '\u00a0'}</span>
          </div>
        );
      })}
    </div>
  );
}
