import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TemplateCard } from '@/features/templates/components/TemplateCard';
import { templateCatalog } from '@/features/templates/lib/catalog';

describe('template card', () => {
  it('shows the name, how to use it and a copy button; the live player waits until it is on screen', () => {
    const entry = templateCatalog().find((t) => t.id === 'typewriter')!;
    const html = renderToStaticMarkup(<TemplateCard entry={entry} brand={{ name: 'K', font: 'Baloo2', logoSrc: null, outroText: '', subscribeText: '', palette: [] } as never} />);
    expect(html).toContain(entry.name);
    expect(html).toContain('remotion/kinetic · look = typewriter');
    expect(html).toContain('Chép tên');
    expect(html).not.toContain('remotion-player');
  });
});
