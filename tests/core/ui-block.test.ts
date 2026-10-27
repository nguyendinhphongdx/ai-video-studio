import { describe, expect, it } from 'vitest';

import { toolCatalog } from '@/tools/registry';
import { UI_LOOKS } from '../../remotion/shots/ui/looks';
import { UI_LOOK_META } from '../../remotion/shots/ui/meta';
import { uiItems, uiTarget } from '../../remotion/blocks/ui-data';
import { uiLookFor } from '../../remotion/blocks/variants';

const block = () => toolCatalog.block('remotion/ui')!;

describe('software-window scene', () => {
  it('draws every listed look and rotates only through real ones', () => {
    expect(Object.keys(UI_LOOKS).sort()).toEqual(UI_LOOK_META.map((m) => m.id).sort());
    const ids = new Set<string>(UI_LOOK_META.map((m) => m.id));
    const rotation = Array.from({ length: 10 }, (_, i) => uiLookFor(i + 1));
    expect(rotation.every((id) => ids.has(id))).toBe(true);
    expect(new Set(rotation).size).toBe(10);
  });

  it('finds the clicked item by number or by its text, falling back to the last', () => {
    const items = ['A', 'B', 'C'];
    expect(uiTarget('2', items)).toBe(1);
    expect(uiTarget('c', items)).toBe(2);
    expect(uiTarget('', items)).toBe(2);
    expect(uiTarget('9', items)).toBe(2);
    expect(uiItems(' a \n\n b \nc\nd\ne\nf\ng')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('normalises the lines and the target, and keeps its sounds inside the scene', () => {
    const b = block();
    const out = b.normalize!({ title: ' x ', items: 'một\n\nhai\nba', target: 'Ba', look: 'auto', transition: 'auto' } as never) as Record<string, string>;
    expect(out).toMatchObject({ title: 'x', items: 'một\nhai\nba', target: '3' });
    const click = b.sfx!({ props: { ...(b.defaults as Record<string, unknown>), look: 'click-select' }, ordinal: 1, durationSec: 5 });
    expect(click.some((c) => c.kind === 'tick')).toBe(true);
    const list = b.sfx!({ props: { ...(b.defaults as Record<string, unknown>), look: 'rows-cascade' }, ordinal: 1, durationSec: 5 });
    expect(list.filter((c) => c.kind === 'pop').length).toBeGreaterThan(1);
    for (const c of [...click, ...list]) expect(c.at).toBeLessThan(5);
    expect(b.aiGuide).toContain('click-select');
    expect(b.minSeconds).toBe(5);
  });
});
