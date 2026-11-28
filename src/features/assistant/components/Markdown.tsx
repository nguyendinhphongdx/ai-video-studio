'use client';

import { Streamdown } from 'streamdown';

/** A chat reply as Markdown: headings, lists, tables, code and links, and tolerant of text that is still arriving. */
export function Markdown({ text, live = false }: { text: string; live?: boolean }) {
  return (
    <Streamdown mode={live ? 'streaming' : 'static'} isAnimating={live} className="min-w-0 break-words text-small [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {text}
    </Streamdown>
  );
}
