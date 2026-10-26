import type { ReactNode } from 'react';

/** Just enough Markdown for chat replies: paragraphs, bullet lists, **bold**, `code`. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const items = lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>);
          return ordered ? (
            <ol key={i} className="list-decimal pl-5">
              {items}
            </ol>
          ) : (
            <ul key={i} className="list-disc pl-5">
              {items}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {lines.map((l, k) => (
              <span key={k}>
                {k ? <br /> : null}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
